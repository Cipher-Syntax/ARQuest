from django.urls import path
from . import views

urlpatterns = [
    path('<int:id>/metadata/', views.asset_metadata, name='asset_metadata'),
]
