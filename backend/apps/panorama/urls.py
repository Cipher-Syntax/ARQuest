from django.urls import path
from . import views

urlpatterns = [
    path('scenes/<int:id>/', views.panorama_scene_detail, name='panorama-scene-detail'),
]
