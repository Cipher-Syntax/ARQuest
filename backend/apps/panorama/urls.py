from django.urls import path
from . import views

urlpatterns = [
    path('scenes/<uuid:id>/', views.panorama_scene_detail, name='panorama-scene-detail'),
    path('buildings/<uuid:id>/walkthrough/', views.building_panorama_walkthrough, name='building-walkthrough'),
    
    path('buildings/<uuid:building_id>/scenes/', views.building_scenes_admin, name='building-scenes-admin'),
    path('scenes/<uuid:id>/admin/', views.scene_detail_admin, name='scene-detail-admin'),
    
    path('scenes/<uuid:scene_id>/hotspots/', views.scene_hotspots_admin, name='scene-hotspots-admin'),
    path('hotspots/<uuid:id>/', views.hotspot_detail_admin, name='hotspot-detail-admin'),
]
