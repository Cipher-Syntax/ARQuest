from rest_framework import serializers
from .models import Building, Geofence


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
    
    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'is_active', 'geofences', 'created_at', 'updated_at']


class BuildingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['name', 'slug', 'description', 'latitude', 'longitude', 'is_active']
    
    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return value
