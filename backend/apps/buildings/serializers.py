from rest_framework import serializers
from .models import Building, Geofence


class GeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['id', 'center_latitude', 'center_longitude', 'radius_meters', 'is_active']


class BuildingSerializer(serializers.ModelSerializer):
    geofences = GeofenceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'is_active', 'geofences']
