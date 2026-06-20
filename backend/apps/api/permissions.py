from rest_framework.permissions import BasePermission
from rest_framework.exceptions import APIException
from .models import SystemSetting

class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = 'System is under maintenance.'
    default_code = 'service_unavailable'

class MaintenanceModePermission(BasePermission):
    def has_permission(self, request, view):
        settings = SystemSetting.get_settings()
        if not settings.maintenance_mode:
            return True
        if request.user and request.user.is_staff:
            return True
        raise ServiceUnavailable()
