from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import reports as report_views

router = DefaultRouter()
router.register(r'feedback', views.FeedbackViewSet, basename='feedback')
router.register(r'notifications', views.NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health_check, name='health_check'),
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
    path('dashboard/gps-unlocks/', views.dashboard_gps_unlocks, name='dashboard_gps_unlocks'),
    path('reports/<str:report_type>/', report_views.reports_view, name='reports'),
    path('settings/public/', views.public_settings, name='public_settings'),
    path('settings/', views.system_settings, name='system_settings'),
    path('settings/logo/', views.system_settings_logo, name='system_settings_logo'),
]
