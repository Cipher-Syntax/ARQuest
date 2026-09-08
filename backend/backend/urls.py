"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView
from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.api.urls')),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/buildings/', include('apps.buildings.urls')),
    path('api/geofencing/', include('apps.geofencing.urls')),
    path('api/panorama/', include('apps.panorama.urls')),
    path('api/assets/', include('apps.buildings.asset_urls')),
    path('api/gamification/', include('apps.gamification.urls')),
    path('api/navigation/', include('apps.navigation.urls')),
]

def cached_media_serve(request, path, document_root=None, show_indexes=False):
    response = serve(request, path, document_root, show_indexes)
    response['Cache-Control'] = 'public, max-age=2592000'
    response['Access-Control-Allow-Origin'] = '*'
    return response

if settings.DEBUG:
    urlpatterns += [
        re_path(r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'), cached_media_serve, {'document_root': settings.MEDIA_ROOT}),
    ]

