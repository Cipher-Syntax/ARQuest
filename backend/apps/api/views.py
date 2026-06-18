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

    return success_response({
        'total_buildings': total_buildings,
        'active_students': active_students,
        'trivia_facts': trivia_facts,
        'gps_unlocks_today': gps_unlocks_today
    })
