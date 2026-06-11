from django.urls import path
from . import views

urlpatterns = [
    path('', views.building_list_create, name='building_list_create'),
    path('<int:id>/', views.building_detail, name='building_detail'),
    path('<int:id>/geofence/', views.building_geofence, name='building_geofence'),
    path('geofence/<int:id>/', views.geofence_update, name='geofence_update'),
]
