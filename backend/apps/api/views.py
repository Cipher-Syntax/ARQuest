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
from apps.buildings.models import Building, BuildingUnlock
from apps.gamification.models import UserQuestProgress
from apps.quizzes.models import TriviaFact
from apps.authentication.models import User
from .responses import success_response, error_response
from .errors import ErrorCodes

from django.db.models import Count

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    if not request.user.is_admin_role:
        return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=403)
        
    total_buildings = Building.objects.filter(is_active=True).count()
    active_students = User.objects.filter(role='student', is_active=True).count()
    trivia_facts = TriviaFact.objects.filter(is_active=True).count()
    
    today = timezone.now().date()
    gps_unlocks_today = BuildingUnlock.objects.filter(
        unlocked_at__date=today,
        source='geofence'
    ).count()

    import calendar
    
    # Dynamic GPS Unlocks
    gps_unlocks = {
        'daily': [],
        'weekly': [],
        'monthly': [],
        'yearly': []
    }
    
    # Daily: Last 7 days
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = BuildingUnlock.objects.filter(
            unlocked_at__date=day,
            source='geofence'
        ).count()
        gps_unlocks['daily'].append({
            'label': day.strftime('%a'),
            'value': count
        })

    # Weekly: Last 4 weeks
    for i in range(3, -1, -1):
        start_date = today - timedelta(days=i*7 + 7)
        end_date = today - timedelta(days=i*7)
        count = BuildingUnlock.objects.filter(
            unlocked_at__date__gte=start_date,
            unlocked_at__date__lt=end_date,
            source='geofence'
        ).count()
        gps_unlocks['weekly'].append({
            'label': f"W{4-i}",
            'value': count
        })

    # Monthly: Last 12 months
    for i in range(11, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        count = BuildingUnlock.objects.filter(
            unlocked_at__year=y,
            unlocked_at__month=m,
            source='geofence'
        ).count()
        gps_unlocks['monthly'].append({
            'label': calendar.month_abbr[m],
            'value': count
        })

    # Yearly: Last 5 years
    for i in range(4, -1, -1):
        y = today.year - i
        count = BuildingUnlock.objects.filter(
            unlocked_at__year=y,
            source='geofence'
        ).count()
        gps_unlocks['yearly'].append({
            'label': str(y),
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

    # User Role Distribution
    students_count = User.objects.filter(role='student', is_active=True).count()
    professionals_count = User.objects.filter(role='professional', is_active=True).count()
    visitors_count = User.objects.filter(role='visitor', is_active=True).count()
    admins_count = User.objects.filter(role='admin', is_active=True).count()
    total_users_count = students_count + professionals_count + visitors_count + admins_count

    role_distribution = {
        'students': students_count,
        'professionals': professionals_count,
        'visitors': visitors_count,
        'admins': admins_count,
        'total': total_users_count
    }

    # Content & System Coverage
    from apps.panorama.models import PanoramaScene
    from apps.gamification.models import Quest
    from apps.quizzes.models import QuizQuestion
    from .models import Feedback, Notification

    total_panoramas = PanoramaScene.objects.filter(is_active=True).count()
    buildings_with_panoramas = PanoramaScene.objects.filter(is_active=True).values('building_id').distinct().count()
    total_quests = Quest.objects.filter(is_active=True).count()
    total_challenges = Quest.objects.filter(is_active=True, expires_at__isnull=False).count()
    total_quizzes = QuizQuestion.objects.filter(is_active=True).count()
    open_feedbacks = Feedback.objects.filter(status='open').count()

    content_coverage = {
        'total_buildings': total_buildings,
        'buildings_with_panoramas': buildings_with_panoramas,
        'total_panoramas': total_panoramas,
        'total_quests': total_quests,
        'total_challenges': total_challenges,
        'total_quizzes': total_quizzes,
        'open_feedbacks': open_feedbacks,
    }

    # Recent Real-Time Activity & Notifications
    recent_notifications = Notification.objects.all().order_by('-created_at')[:5]
    activity_list = []
    for n in recent_notifications:
        activity_list.append({
            'id': str(n.id),
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'created_at': n.created_at.isoformat(),
        })

    # Recent Open Feedbacks
    recent_feedbacks = Feedback.objects.filter(status='open').order_by('-created_at')[:4]
    feedback_list = []
    for f in recent_feedbacks:
        feedback_list.append({
            'id': f.id,
            'type': f.type,
            'user': f.user.username if f.user else 'Anonymous',
            'message': f.message[:90] + ('...' if len(f.message) > 90 else ''),
            'created_at': f.created_at.isoformat(),
        })

    return success_response({
        'total_buildings': total_buildings,
        'active_students': active_students,
        'trivia_facts': trivia_facts,
        'gps_unlocks_today': gps_unlocks_today,
        'gps_unlocks': gps_unlocks,
        'building_status': building_status,
        'most_visited': most_visited,
        'least_visited': least_visited,
        'quest_completion_rate': quest_completion_rate,
        'total_quests_completed': completed_quests,
        'role_distribution': role_distribution,
        'content_coverage': content_coverage,
        'recent_activity': activity_list,
        'recent_feedbacks': feedback_list
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
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required to modify settings', status_code=403)
            
        serializer = SystemSettingSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            Notification.objects.create(
                title="System Settings Updated",
                message=f"System settings were modified by {request.user.email}.",
                type="SYSTEM"
            )
            return success_response(serializer.data)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', details=serializer.errors, status_code=400)

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
from rest_framework.pagination import PageNumberPagination
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100

class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    pagination_class = FeedbackPagination
    
    def get_queryset(self):
        qs = Feedback.objects.all() if self.request.user.is_admin_role else Feedback.objects.filter(user=self.request.user)
        
        status_filter = self.request.query_params.get('status')
        type_filter = self.request.query_params.get('type')
        
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        if type_filter and type_filter != 'all':
            qs = qs.filter(type=type_filter)
            
        return qs.order_by('-created_at')
        
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return [IsAuthenticated()]
        
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        Notification.objects.create(
            title="New Feedback Submitted",
            message=f"A new feedback has been submitted by {self.request.user.email}.",
            type="FEEDBACK"
        )

from .models import Notification
from .serializers import NotificationSerializer
from rest_framework.decorators import action

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    pagination_class = FeedbackPagination
    
    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            return Notification.objects.none()
            
        # Admin gets broadcast notifications (recipient=None) and personal notifications
        if user.is_admin_role:
            from django.db.models import Q
            qs = Notification.objects.filter(Q(recipient=user) | Q(recipient__isnull=True))
        else:
            qs = Notification.objects.filter(recipient=user)
            
        read_status = self.request.query_params.get('read_status')
        if read_status == 'read':
            qs = qs.filter(is_read=True)
        elif read_status == 'unread':
            qs = qs.filter(is_read=False)
            
        sort_by = self.request.query_params.get('sort', 'desc')
        if sort_by == 'asc':
            return qs.order_by('created_at')
        return qs.order_by('-created_at')
        
    def get_permissions(self):
        return [IsAuthenticated()]
        
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return success_response({'status': 'read'})
        
    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        qs = self.get_queryset()
        qs.update(is_read=True)
        return success_response({'status': 'all_read'})
