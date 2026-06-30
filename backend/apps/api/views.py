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

from django.db.models import Count
from apps.buildings.models import UserQuestProgress

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
    buildings_recent = Building.objects.all().order_by('-updated_at')[:4]
    building_status = []
    for b in buildings_recent:
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

    # Most / Least Visited Buildings
    buildings_with_unlocks = Building.objects.filter(is_active=True).annotate(unlock_count=Count('unlocks')).order_by('-unlock_count')
    most_visited = list(buildings_with_unlocks.values('id', 'name', 'unlock_count')[:5])
    least_visited = list(buildings_with_unlocks.order_by('unlock_count').values('id', 'name', 'unlock_count')[:5])

    # Quest Completion Rate
    total_quest_progress = UserQuestProgress.objects.count()
    completed_quests = UserQuestProgress.objects.filter(is_completed=True).count()
    quest_completion_rate = round((completed_quests / total_quest_progress * 100), 1) if total_quest_progress > 0 else 0

    return success_response({
        'total_buildings': total_buildings,
        'active_students': active_students,
        'trivia_facts': trivia_facts,
        'gps_unlocks_today': gps_unlocks_today,
        'weekly_data': weekly_data,
        'building_status': building_status,
        'most_visited': most_visited,
        'least_visited': least_visited,
        'quest_completion_rate': quest_completion_rate,
        'total_quests_completed': completed_quests
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

@api_view(['GET'])
@permission_classes([AllowAny])
def public_settings(request):
    settings = SystemSetting.get_settings()
    data = {
        "app_name": settings.app_name,
        "maintenance_mode": settings.maintenance_mode,
        "enable_gps": settings.enable_gps,
        "enable_qr": settings.enable_qr,
        "enable_ar_selfie": settings.enable_ar_selfie,
        "enable_trivia": settings.enable_trivia,
        "enable_accreditation": settings.enable_accreditation,
        "enable_leaderboard": settings.enable_leaderboard,
    }
    return Response({"success": True, "data": data})

from rest_framework import viewsets
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    
    def get_queryset(self):
        if self.request.user.is_admin_role:
            return Feedback.objects.all().order_by('-created_at')
        return Feedback.objects.filter(user=self.request.user).order_by('-created_at')
        
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return [IsAuthenticated()]
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
