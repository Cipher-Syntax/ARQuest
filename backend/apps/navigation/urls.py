from django.urls import path
from . import views

urlpatterns = [
    # Route calculator
    path('route/', views.route, name='navigation-route'),

    # NavigationNode CRUD
    path('nodes/', views.node_list, name='navigation-node-list'),
    path('nodes/<uuid:pk>/', views.node_detail, name='navigation-node-detail'),

    # NavigationPath CRUD
    path('paths/', views.path_list, name='navigation-path-list'),
    path('paths/<uuid:pk>/', views.path_detail, name='navigation-path-detail'),
]
