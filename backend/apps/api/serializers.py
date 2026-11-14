from rest_framework import serializers
import re

from .models import SystemSetting

HEX_COLOR_PATTERN = r'^#[0-9A-Fa-f]{6}$'


class SystemSettingSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True, write_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SystemSetting
        fields = '__all__'

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        try:
            url = obj.logo.url
        except ValueError:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def validate_brand_color(self, value):
        if value in (None, ''):
            return SystemSetting._meta.get_field('brand_color').default
        value = value.strip()
        if not re.match(HEX_COLOR_PATTERN, value):
            raise serializers.ValidationError(
                'Enter a hex color in the form #RRGGBB.'
            )
        return value.upper()

from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta:
        model = Feedback
        fields = ['id', 'user', 'username', 'role', 'type', 'message', 'status', 'created_at']
        read_only_fields = ['user', 'created_at']

from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'title', 'message', 'type', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']
