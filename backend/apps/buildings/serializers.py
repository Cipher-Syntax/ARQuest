from rest_framework import serializers
from .models import Building, Geofence, BuildingUnlock, BuildingAsset, Quest, TriviaFact, Department


class DepartmentSerializer(serializers.ModelSerializer):
    building_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'color_hex', 'is_active', 'building_count']

    def get_building_count(self, obj):
        return obj.buildings.count()


class DepartmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['name', 'code', 'description', 'color_hex', 'is_active']

    def validate_code(self, value):
        import re
        if not re.match(r'^[-a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError('Code must be slug-safe (letters, numbers, hyphens, underscores only).')
        return value

class QuestSerializer(serializers.ModelSerializer):
    target_building_name = serializers.CharField(source='target_building.name', read_only=True)

    class Meta:
        model = Quest
        fields = ['id', 'title', 'hint', 'target_building', 'target_building_name', 'reward_points', 'is_active', 'created_at']

class TriviaFactSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = TriviaFact
        fields = ['id', 'building', 'building_name', 'fact', 'is_active', 'created_at', 'updated_at']
class GeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['id', 'latitude', 'longitude', 'radius_meters', 'is_active', 'created_at', 'updated_at']


class GeofenceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['latitude', 'longitude', 'radius_meters', 'is_active']
    
    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return value
    
    def validate_radius_meters(self, value):
        if value <= 0:
            raise serializers.ValidationError('Radius must be greater than 0')
        return value


class BuildingSerializer(serializers.ModelSerializer):
    geofences = GeofenceSerializer(many=True, read_only=True)
    model_url = serializers.SerializerMethodField()
    qr_code_secret = serializers.SerializerMethodField()
    departments = DepartmentSerializer(many=True, read_only=True)
    primary_department = DepartmentSerializer(read_only=True)

    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_active', 'geofences',
                  'model_url', 'model_version', 'model_file_size', 'model_active', 'hotspots', 'qr_code_secret',
                  'departments', 'primary_department', 'created_at', 'updated_at']
    
    def get_model_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
        return None

    def get_qr_code_secret(self, obj):
        request = self.context.get('request')
        if request and getattr(request.user, 'is_admin_role', False):
            return str(obj.qr_code_secret)
        return None


class BuildingWriteSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    hotspots = serializers.CharField(required=False, allow_blank=True)
    department_ids = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='departments',
        many=True,
        required=False
    )
    primary_department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='primary_department',
        allow_null=True,
        required=False
    )

    class Meta:
        model = Building
        fields = ['name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_active',
                  'model_version', 'model_active', 'model_file', 'hotspots', 'department_ids', 'primary_department_id']
    
    def validate_latitude(self, value):
        if value is not None and (value < -90 or value > 90):
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value is not None and (value < -180 or value > 180):
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return value
        
    def validate_hotspots(self, value):
        import json
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                raise serializers.ValidationError('Invalid JSON for hotspots')
        return value




class BuildingUnlockSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    building_slug = serializers.CharField(source='building.slug', read_only=True)
    
    class Meta:
        model = BuildingUnlock
        fields = ['id', 'building', 'building_name', 'building_slug', 'source', 'unlocked_at', 'last_validated_at']
        read_only_fields = ['unlocked_at', 'last_validated_at']


class UnlockedBuildingSerializer(serializers.ModelSerializer):
    is_unlocked = serializers.BooleanField(default=True)
    unlock_source = serializers.CharField(default='role_access')
    unlocked_at = serializers.DateTimeField(required=False, allow_null=True)
    model_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_unlocked', 'unlock_source', 
                  'unlocked_at', 'model_url', 'model_version', 'model_file_size', 'model_active', 'hotspots']
    
    def get_model_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
        return None

class BuildingAssetSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = BuildingAsset
        fields = ['id', 'building', 'asset_type', 'file_url', 'version', 'file_size', 'checksum', 'is_active', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
