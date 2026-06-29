from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.response import Response
from apps.api.models import SystemSetting
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.core.mail import send_mail
from django.conf import settings
from apps.api.responses import success_response, error_response
from .serializers import LoginSerializer, UserSerializer, RegisterSerializer, VerifyOTPSerializer, ResendOTPSerializer, CreateProfessionalSerializer
from .models import User, EmailOTP


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    if SystemSetting.get_settings().maintenance_mode:
        return Response({'success': False, 'error': 'System is under maintenance. Registration disabled.'}, status=503)

    serializer = RegisterSerializer(data=request.data)
    
    if not serializer.is_valid():
        return error_response(
            code='validation_error',
            message='Registration failed.',
            status_code=status.HTTP_400_BAD_REQUEST,
            details=serializer.errors
        )
    
    user = serializer.save()
    
    # Generate and send OTP
    otp = EmailOTP.generate_otp()
    EmailOTP.objects.create(email=user.email, otp=otp)
    
    try:
        send_mail(
            subject='ARQuest - Verify Your Email',
            message=f'Your verification code is: {otp}\n\nThis code will expire in 10 minutes.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as e:
        user.delete()  # Rollback user creation if email fails
        return error_response(
            code='email_error',
            message='Failed to send verification email.',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return success_response({
        'message': 'Registration successful. Please check your email for the verification code.',
        'email': user.email
    }, status_code=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    serializer = VerifyOTPSerializer(data=request.data)
    
    if not serializer.is_valid():
        return error_response(
            code='invalid_otp',
            message='OTP verification failed.',
            status_code=status.HTTP_400_BAD_REQUEST,
            details=serializer.errors
        )
    
    email = serializer.validated_data['email']
    otp_obj = serializer.validated_data['otp_obj']
    
    try:
        user = User.objects.get(email=email)
        user.is_active = True
        user.email_verified = True
        user.save()
        
        otp_obj.is_used = True
        otp_obj.save()
        
        return success_response({
            'message': 'Email verified successfully. You can now log in.',
            'user': UserSerializer(user).data
        })
    except User.DoesNotExist:
        return error_response(
            code='user_not_found',
            message='User not found.',
            status_code=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    serializer = ResendOTPSerializer(data=request.data)
    
    if not serializer.is_valid():
        return error_response(
            code='validation_error',
            message='Invalid email.',
            status_code=status.HTTP_400_BAD_REQUEST,
            details=serializer.errors
        )
    
    email = serializer.validated_data['email']
    
    try:
        user = User.objects.get(email=email)
        
        if user.is_active and user.email_verified:
            return error_response(
                code='already_verified',
                message='Email is already verified.',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new OTP
        otp = EmailOTP.generate_otp()
        EmailOTP.objects.create(email=email, otp=otp)
        
        send_mail(
            subject='ARQuest - Verify Your Email',
            message=f'Your verification code is: {otp}\n\nThis code will expire in 10 minutes.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return success_response({
            'message': 'Verification code resent successfully.'
        })
    except User.DoesNotExist:
        return error_response(
            code='user_not_found',
            message='No user found with this email.',
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return error_response(
            code='email_error',
            message='Failed to send verification email.',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        error_message = serializer.errors
        if 'non_field_errors' in error_message:
            error_message = error_message['non_field_errors'][0]
        return error_response(
            code='invalid_credentials',
            message=str(error_message),
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    user = serializer.validated_data['user']
    if user and SystemSetting.get_settings().maintenance_mode and not user.is_staff:
        return Response({'success': False, 'error': 'System is under maintenance.'}, status=503)

    # Update daily login streak (awards +10 EXP on first login of the day)
    streak_bonus = user.update_streak()

    refresh = RefreshToken.for_user(user)

    return success_response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
        'streak_bonus_exp': streak_bonus,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return error_response(
            code='missing_token',
            message='Refresh token is required.',
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return success_response({'message': 'Logged out successfully.'})
    except TokenError:
        return error_response(
            code='invalid_token',
            message='Invalid or expired refresh token.',
            status_code=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    serializer = TokenRefreshSerializer(data=request.data)

    try:
        serializer.is_valid(raise_exception=True)
    except User.DoesNotExist:
        return error_response(
            code='user_not_found',
            message='Refresh token belongs to a user that no longer exists.',
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    except TokenError:
        return error_response(
            code='invalid_token',
            message='Invalid or expired refresh token.',
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    return success_response({
        'access': serializer.validated_data['access']
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    if request.method == 'PATCH':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response({'user': serializer.data})
        return error_response('validation_error', 'Invalid data', details=serializer.errors)
        
    return success_response({
        'user': UserSerializer(request.user).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    users = User.objects.all().order_by('-date_joined')
    return success_response(UserSerializer(users, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_professional(request):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    
    serializer = CreateProfessionalSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response(
            code='validation_error',
            message='Failed to create professional account.',
            status_code=status.HTTP_400_BAD_REQUEST,
            details=serializer.errors
        )
    
    user = serializer.save()
    return success_response({
        'message': 'Professional account created successfully.',
        'user': UserSerializer(user).data
    }, status_code=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    if not SystemSetting.get_settings().enable_leaderboard:
        return Response({'success': False, 'error': 'Leaderboard is currently disabled.'}, status=403)
    users = User.objects.filter(role='student').order_by('-exploration_points')[:50]
    return success_response(UserSerializer(users, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def daily_checkin(request):
    """
    Called on every app open (from checkToken in AuthContext).
    Updates the daily login streak and awards +10 EXP if this is the
    user's first checkin of the day. Safe to call multiple times per day
    — update_streak() is a no-op on same-day repeat calls.
    """
    bonus_exp = request.user.update_streak()
    return success_response({
        'streak_count': request.user.streak_count,
        'streak_bonus_exp': bonus_exp,
    })
