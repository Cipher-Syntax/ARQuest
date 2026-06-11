from django.urls import path
from . import views

urlpatterns = [
    path('', views.building_list, name='building_list'),
    path('<int:id>/', views.building_detail, name='building_detail'),
]
