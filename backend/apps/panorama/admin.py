from django.contrib import admin
from .models import PanoramaScene, PanoramaHotspot


class PanoramaHotspotInline(admin.TabularInline):
    model = PanoramaHotspot
    fk_name = 'source_scene'
    extra = 1
    fields = ['target_scene', 'label', 'yaw', 'pitch', 'is_active']


@admin.register(PanoramaScene)
class PanoramaSceneAdmin(admin.ModelAdmin):
    list_display = ['title', 'building', 'is_start_scene', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active', 'is_start_scene', 'building']
    search_fields = ['title', 'building__name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [PanoramaHotspotInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('building', 'title', 'image', 'is_active')
        }),
        ('Walkthrough Settings', {
            'fields': ('is_start_scene', 'sort_order')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PanoramaHotspot)
class PanoramaHotspotAdmin(admin.ModelAdmin):
    list_display = ['label', 'source_scene', 'target_scene', 'yaw', 'pitch', 'is_active']
    list_filter = ['is_active', 'source_scene__building']
    search_fields = ['label', 'source_scene__title', 'target_scene__title']
