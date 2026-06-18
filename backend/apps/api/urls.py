from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
    path('settings/', views.system_settings, name='system_settings'),
]
