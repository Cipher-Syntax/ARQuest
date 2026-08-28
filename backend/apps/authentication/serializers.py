from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, EmailOTP


class UserSerializer(serializers.ModelSerializer):
    rank_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'email_verified', 'exploration_points', 'avatar_id', 'streak_count', 'last_login_date', 'is_active', 'date_joined', 'rank_info']
        read_only_fields = ['id', 'role', 'email_verified', 'exploration_points', 'streak_count', 'last_login_date', 'date_joined']

    def get_rank_info(self, obj):
        from apps.gamification.utils import get_rank_info
        return get_rank_info(obj.exploration_points)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        
        # Enforce password complexity
        try:
            validate_password(data['password'])
        except Exception as e:
            raise serializers.ValidationError({'password': list(e.messages)})
            
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='student',
            is_active=False  # Inactive until email verified
        )
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    
    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            otp_obj = EmailOTP.objects.filter(
                email=email,
                otp=otp,
                is_used=False
            ).latest('created_at')
            
            if not otp_obj.is_valid():
                raise serializers.ValidationError('OTP has expired.')
            
            data['otp_obj'] = otp_obj
        except EmailOTP.DoesNotExist:
            raise serializers.ValidationError('Invalid OTP.')
        
        return data


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


from django.db import models


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    reactivate = serializers.BooleanField(required=False, default=False)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        reactivate = data.get('reactivate', False)
        
        if not username or not password:
            raise serializers.ValidationError('Username and password are required.')
        
        user = authenticate(username=username, password=password)
        
        if user:
            if not user.is_active:
                raise serializers.ValidationError({'account_deactivated': True, 'detail': 'Your account is currently deactivated.'})
            data['user'] = user
            return data

        # If authenticate returned None, check if user exists and is inactive with correct password
        candidate = User.objects.filter(models.Q(username__iexact=username) | models.Q(email__iexact=username)).first()
        if candidate and candidate.check_password(password):
            if not candidate.email_verified:
                raise serializers.ValidationError('Email not verified. Please verify your email before logging in.')
            
            if not candidate.is_active:
                if reactivate:
                    candidate.is_active = True
                    candidate.save(update_fields=['is_active'])
                    data['user'] = candidate
                    data['reactivated'] = True
                    return data
                else:
                    raise serializers.ValidationError({
                        'account_deactivated': True,
                        'detail': 'Your account is currently deactivated. Would you like to reactivate it and log in?'
                    })

        raise serializers.ValidationError('Invalid username or password.')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'New passwords do not match.'})
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from current password.'})
        try:
            validate_password(data['new_password'])
        except Exception as e:
            raise serializers.ValidationError({'new_password': list(e.messages)})
        return data


class DeactivateAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)


class CreateProfessionalSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists.')
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered.')
        return value
        
    def validate(self, data):
        try:
            validate_password(data.get('password'))
        except Exception as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return data
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='professional',
            is_active=True,
            email_verified=True
        )
        return user
