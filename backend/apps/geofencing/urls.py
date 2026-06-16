from django.urls import path
from .views import ValidateLocationView

urlpatterns = [
    path('validate/', ValidateLocationView.as_view(), name='validate-location'),
]
