from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'success': True,
        'data': {'status': 'healthy'},
        'error': None
    })


from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from apps.buildings.models import Building, BuildingUnlock, TriviaFact
from apps.authentication.models import User
from .responses import success_response, error_response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=403)
        
    total_buildings = Building.objects.filter(is_active=True).count()
    active_students = User.objects.filter(role='student', is_active=True).count()
    trivia_facts = TriviaFact.objects.filter(is_active=True).count()
    
    today = timezone.now().date()
    gps_unlocks_today = BuildingUnlock.objects.filter(
        unlocked_at__date=today,
        source='geofence'
    ).count()

    # Weekly GPS Unlocks
    weekly_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = BuildingUnlock.objects.filter(
            unlocked_at__date=day,
            source='geofence'
        ).count()
        weekly_data.append({
            'day': day.strftime('%a'),
            'value': count
        })

    # Building Status
    buildings = Building.objects.all().order_by('-updated_at')[:4]
    building_status = []
    for b in buildings:
        words = b.name.split()
        if len(words) > 1:
            code = "".join([word[0] for word in words if word[0].isalpha()]).upper()
        else:
            code = b.name[:3].upper()
            
        building_status.append({
            'code': code[:4],
            'name': b.name,
            'status': 'Live' if b.is_active else 'Draft'
        })

    return success_response({
        'total_buildings': total_buildings,
        'active_students': active_students,
        'trivia_facts': trivia_facts,
        'gps_unlocks_today': gps_unlocks_today,
        'weekly_data': weekly_data,
        'building_status': building_status
    })

from .models import SystemSetting
from .serializers import SystemSettingSerializer

@api_view(['GET', 'PUT'])
@permission_classes([AllowAny])
def system_settings(request):
    settings = SystemSetting.get_settings()
    
    if request.method == 'GET':
        return success_response(SystemSettingSerializer(settings).data)
        
    elif request.method == 'PUT':
        if request.user.is_anonymous or not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required to modify settings', status_code=403)
            
        serializer = SystemSettingSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response('validation_error', 'Invalid data', details=serializer.errors, status_code=400)
