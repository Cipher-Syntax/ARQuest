from django.contrib import admin
from .models import NavigationNode, NavigationPath


@admin.register(NavigationNode)
class NavigationNodeAdmin(admin.ModelAdmin):
    list_display = ['label', 'node_type', 'building', 'latitude', 'longitude', 'is_active', 'created_at']
    list_filter = ['node_type', 'is_active']
    search_fields = ['label']
    list_editable = ['is_active']


@admin.register(NavigationPath)
class NavigationPathAdmin(admin.ModelAdmin):
    list_display = ['start_node', 'end_node', 'distance_meters', 'is_accessible', 'is_active', 'created_at']
    list_filter = ['is_accessible', 'is_active']
    search_fields = ['start_node__label', 'end_node__label']
    list_editable = ['is_active']
