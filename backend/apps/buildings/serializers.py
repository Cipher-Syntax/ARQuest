from rest_framework import serializers
from .models import Building, Geofence, BuildingUnlock


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
    
    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'is_active', 'geofences', 
                  'model_url', 'model_version', 'model_file_size', 'model_active', 'created_at', 'updated_at']
    
    def get_model_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
        return None


class BuildingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['name', 'slug', 'description', 'latitude', 'longitude', 'is_active', 'model_version', 'model_active', 'model_file']
    
    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180')
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
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'is_unlocked', 'unlock_source', 
                  'unlocked_at', 'model_url', 'model_version', 'model_file_size', 'model_active']
    
    def get_model_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
        return None
