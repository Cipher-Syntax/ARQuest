from django.urls import path
from . import views
from apps.panorama import views as panorama_views

urlpatterns = [
    path('departments/', views.department_list_create, name='department_list_create'),
    path('departments/<int:id>/', views.department_detail, name='department_detail'),
    path('', views.building_list_create, name='building_list_create'),
    path('<int:id>/', views.building_detail, name='building_detail'),
    path('<int:id>/geofence/', views.building_geofence, name='building_geofence'),
    path('geofence/<int:id>/', views.geofence_update, name='geofence_update'),
    path('buildings/<int:id>/metadata/', views.asset_metadata, name='asset_metadata'),
    path('unlock/', views.unlock_building, name='unlock_building'),
    path('unlock/qr/', views.unlock_building_qr, name='unlock_building_qr'),
    path('unlocked/', views.unlocked_buildings, name='unlocked_buildings'),
    path('<int:id>/panorama/', panorama_views.building_panorama_walkthrough, name='building_panorama'),
    path('<int:id>/assets/', views.building_assets, name='building_assets'),
    path('quests/', views.quest_list_create, name='quest_list_create'),
    path('quests/<int:id>/', views.quest_detail, name='quest_detail'),
    path('trivias/', views.trivia_list_create, name='trivia_list_create'),
    path('trivias/<int:id>/', views.trivia_detail, name='trivia_detail'),
]
