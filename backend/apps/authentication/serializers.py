from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, EmailOTP


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'email_verified', 'exploration_points', 'is_active', 'date_joined']
        read_only_fields = ['id', 'role', 'email_verified', 'exploration_points', 'date_joined']


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


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Username and password are required.')
        
        user = authenticate(username=username, password=password)
        
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is inactive.')
        
        data['user'] = user
        return data


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
