from django.contrib import admin
from .models import Quest, UserQuestProgress, Badge, UserBadge

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
