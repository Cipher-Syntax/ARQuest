from django.contrib import admin
from .models import Building, Geofence


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'latitude', 'longitude', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Geofence)
class GeofenceAdmin(admin.ModelAdmin):
    list_display = ['building', 'center_latitude', 'center_longitude', 'radius_meters', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['building__name']
