from django.urls import path
from . import views

urlpatterns = [
    path('scenes/<int:id>/', views.panorama_scene_detail, name='panorama-scene-detail'),
    path('buildings/<int:id>/walkthrough/', views.building_panorama_walkthrough, name='building-walkthrough'),
    
    path('buildings/<int:building_id>/scenes/', views.building_scenes_admin, name='building-scenes-admin'),
    path('scenes/<int:id>/admin/', views.scene_detail_admin, name='scene-detail-admin'),
    
    path('scenes/<int:scene_id>/hotspots/', views.scene_hotspots_admin, name='scene-hotspots-admin'),
    path('hotspots/<int:id>/', views.hotspot_detail_admin, name='hotspot-detail-admin'),
]