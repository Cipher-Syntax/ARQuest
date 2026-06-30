from django.contrib import admin
from .models import Building, Geofence, BuildingUnlock, BuildingAsset, Quest, UserQuestProgress, Department, Badge, UserBadge, QuizQuestion

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'primary_department', 'is_active', 'model_active', 'latitude', 'longitude', 'created_at', 'updated_at']
    list_filter = ['is_active', 'model_active', 'created_at', 'primary_department']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'description', 'is_active', 'primary_department', 'departments')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('3D Model', {
            'fields': ('model_file', 'model_version', 'model_file_size', 'model_active', 'hotspots')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

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

@admin.register(BuildingAsset)
class BuildingAssetAdmin(admin.ModelAdmin):
    list_display = ('building', 'asset_type', 'version', 'is_active', 'updated_at')
    list_filter = ('asset_type', 'is_active', 'building')
    search_fields = ('building__name',)

@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ('title', 'target_building', 'reward_points', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'target_building__name')

@admin.register(UserQuestProgress)
class UserQuestProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'quest', 'is_completed', 'completed_at')
    list_filter = ('is_completed',)
    search_fields = ('user__username', 'quest__title')

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger', 'icon', 'color_hex', 'is_active', 'created_at']
    list_filter = ['is_active', 'trigger']
    search_fields = ['name', 'description']

@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    list_filter = ['badge']
    search_fields = ['user__username', 'badge__name']
    readonly_fields = ['earned_at']

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('question', 'building', 'correct_option', 'exp_reward', 'is_active')
    list_filter = ('is_active', 'building')
    search_fields = ('question', 'building__name')

