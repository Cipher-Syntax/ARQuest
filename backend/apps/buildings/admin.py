from django.contrib import admin
from .models import Building, Geofence, BuildingUnlock


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'latitude', 'longitude', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Geofence)
class GeofenceAdmin(admin.ModelAdmin):
    list_display = ['building', 'latitude', 'longitude', 'radius_meters', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['building__name']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['building']


@admin.register(BuildingUnlock)
class BuildingUnlockAdmin(admin.ModelAdmin):
    list_display = ['user', 'building', 'source', 'unlocked_at', 'last_validated_at']
    list_filter = ['source', 'unlocked_at']
    search_fields = ['user__username', 'building__name']
    readonly_fields = ['unlocked_at', 'last_validated_at']
