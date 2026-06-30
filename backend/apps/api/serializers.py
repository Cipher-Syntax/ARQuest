from rest_framework import serializers
from .models import SystemSetting

class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'

from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta:
        model = Feedback
        fields = ['id', 'user', 'username', 'role', 'type', 'message', 'status', 'created_at']
        read_only_fields = ['user', 'status', 'created_at']
