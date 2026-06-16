from django.urls import path
from . import views
from apps.panorama import views as panorama_views

urlpatterns = [
    path('', views.building_list_create, name='building_list_create'),
    path('<int:id>/', views.building_detail, name='building_detail'),
    path('<int:id>/geofence/', views.building_geofence, name='building_geofence'),
    path('geofence/<int:id>/', views.geofence_update, name='geofence_update'),
    path('unlock/', views.unlock_building, name='unlock_building'),
    path('unlocked/', views.unlocked_buildings, name='unlocked_buildings'),
    path('<int:id>/panorama/', panorama_views.building_panorama_walkthrough, name='building_panorama'),
]
