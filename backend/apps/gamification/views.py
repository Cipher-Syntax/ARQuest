from django.db import transaction
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from apps.api.responses import success_response, error_response
from apps.api.errors import ErrorCodes
from apps.authentication.permissions import IsStudentRole

from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Quest, UserQuestProgress, Badge, UserBadge
from apps.buildings.models import BuildingUnlock, Building
from .serializers import LeaderboardSerializer, QuestSerializer, BadgeSerializer, UserBadgeSerializer

User = get_user_model()


def check_and_award_badges(user):
	"""Check all badge triggers for a user and award any newly earned badges."""
	if not user or getattr(user, 'role', '') != 'student':
		return []
	newly_earned = []
	active_badges = Badge.objects.filter(is_active=True)
	already_earned_ids = set(UserBadge.objects.filter(user=user).values_list('badge_id', flat=True))

	unlock_count = BuildingUnlock.objects.filter(user=user).count()
	quest_count = UserQuestProgress.objects.filter(user=user, is_completed=True).count()
	total_buildings = Building.objects.filter(is_active=True, status__in=['VISIBLE', 'MAINTENANCE']).count()

	trigger_results = {
		'first_unlock': unlock_count >= 1,
		'unlocks_5': unlock_count >= 5,
		'unlocks_10': unlock_count >= 10,
		'unlocks_all': total_buildings > 0 and unlock_count >= total_buildings,
		'first_quest': quest_count >= 1,
		'quests_5': quest_count >= 5,
		'quests_10': quest_count >= 10,
		'points_100': user.exploration_points >= 100,
		'points_500': user.exploration_points >= 500,
		'points_1000': user.exploration_points >= 1000,
	}

	for badge in active_badges:
		if badge.id in already_earned_ids:
			continue
		if trigger_results.get(badge.trigger, False):
			UserBadge.objects.create(user=user, badge=badge)
			newly_earned.append({
				'id': str(badge.id),
				'name': badge.name,
				'description': badge.description,
				'icon': badge.icon,
				'color_hex': badge.color_hex,
			})

	return newly_earned


class LeaderboardView(views.APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		from django.db.models import Count, Q
		users = User.objects.filter(is_active=True, role='student').annotate(
			quests_completed_count=Count('quest_progress', filter=Q(quest_progress__is_completed=True))
		).order_by('-exploration_points')[:50]
		data = []
		for index, user in enumerate(users):
			serializer = LeaderboardSerializer(user, context={'rank': index + 1})
			data.append(serializer.data)

		return Response({
			'success': True,
			'data': data
		})


import random
from datetime import date


class ActiveQuestsView(views.APIView):
	permission_classes = [IsAuthenticated, IsStudentRole]

	def get(self, request):
		user = request.user

		# 1. Get all active daily quests (no expiry)
		from django.db.models import Q
		from django.utils import timezone
		now = timezone.now()

		all_daily_quests = list(Quest.objects.filter(
			is_active=True,
			expires_at__isnull=True
		).select_related('target_building'))

		if not all_daily_quests:
			return Response({'success': True, 'data': {'quests': [], 'weekly_progress': {'completed': 0, 'target': 10}}})

		# 2. Seed the random generator with the user ID and the current date
		today_str = date.today().isoformat()
		random.seed(f"{user.id}-{today_str}")

		# 3. Select 3 Daily Quests (1 Easy, 1 Medium, 1 Hard)
		easy_quests = [q for q in all_daily_quests if q.difficulty == 'EASY']
		medium_quests = [q for q in all_daily_quests if q.difficulty == 'MEDIUM']
		hard_quests = [q for q in all_daily_quests if q.difficulty == 'HARD']

		daily_quests = []
		if easy_quests: daily_quests.append(random.choice(easy_quests))
		if medium_quests: daily_quests.append(random.choice(medium_quests))
		if hard_quests: daily_quests.append(random.choice(hard_quests))

		# Fallback: if we didn't get 3 quests because of missing difficulty tiers
		while len(daily_quests) < 3 and len(daily_quests) < len(all_daily_quests):
			candidate = random.choice(all_daily_quests)
			if candidate not in daily_quests:
				daily_quests.append(candidate)

		# Reset the seed for the rest of the application
		random.seed()

		# Get completed IDs to pass to serializer context
		completed_quest_ids = set(UserQuestProgress.objects.filter(
			user=user, is_completed=True
		).values_list('quest_id', flat=True))

		# Get weekly progress
		from django.utils import timezone
		from datetime import timedelta
		
		now = timezone.now()
		start_of_week = now - timedelta(days=now.weekday())
		start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
		
		weekly_completed_count = UserQuestProgress.objects.filter(
			user=user, 
			is_completed=True,
			completed_at__gte=start_of_week
		).count()
		
		weekly_goal = 10 # Hardcoded goal for now

		serializer = QuestSerializer(daily_quests, many=True, context={'request': request, 'completed_quest_ids': completed_quest_ids})

		return Response({
			'success': True,
			'data': {
				'quests': serializer.data,
				'weekly_progress': {
					'completed': weekly_completed_count,
					'target': weekly_goal
				}
			}
		})


class ChallengesView(views.APIView):
	permission_classes = [IsAuthenticated, IsStudentRole]

	def get(self, request):
		user = request.user
		from django.utils import timezone
		now = timezone.now()
		
		# Active challenges that haven't expired
		challenges = Quest.objects.filter(
			is_active=True,
			expires_at__gt=now
		).select_related('target_building')

		completed_ids = set(UserQuestProgress.objects.filter(user=user, is_completed=True).values_list('quest_id', flat=True))

		serializer = QuestSerializer(challenges, many=True, context={'request': request, 'completed_quest_ids': completed_ids})
		
		return Response({
			'success': True,
			'data': serializer.data
		})


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class CompleteQuestView(views.APIView):
	permission_classes = [IsAuthenticated, IsStudentRole]

	def post(self, request, pk):
		try:
			quest = Quest.objects.get(pk=pk, is_active=True)
		except Quest.DoesNotExist:
			return Response({
				'success': False,
				'error': 'Quest not found or inactive'
			}, status=status.HTTP_404_NOT_FOUND)

		with transaction.atomic():
			progress, created = UserQuestProgress.objects.get_or_create(
				user=request.user,
				quest=quest
			)
			progress = UserQuestProgress.objects.select_for_update().get(id=progress.id)

			if progress.is_completed:
				return Response({
					'success': False,
					'error': 'Quest already completed'
				}, status=status.HTTP_400_BAD_REQUEST)

			# Mark completed and award points
			progress.is_completed = True
			progress.completed_at = timezone.now()
			progress.save()

			user = User.objects.select_for_update().get(id=request.user.id)
			user.exploration_points += quest.reward_points
			user.save()

		# Check and award badges
		newly_earned_badges = check_and_award_badges(user)

		from apps.api.models import SystemSetting
		from apps.quizzes.serializers import TriviaFactSerializer

		trivia_fact = None
		if SystemSetting.get_settings().enable_trivia:
			building = quest.target_building
			if building:
				trivia_fact = building.trivia_facts.order_by('?').first()

		response_data = {
			'message': f'Quest completed! You earned {quest.reward_points} points.',
			'total_points': user.exploration_points,
			'newly_earned_badges': newly_earned_badges,
		}

		from .utils import get_rank_info
		response_data['rank_info'] = get_rank_info(user.exploration_points)

		if trivia_fact:
			response_data['trivia'] = TriviaFactSerializer(trivia_fact).data

		return Response({
			'success': True,
			'data': response_data
		})


class RecentActivityView(views.APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		recent = UserQuestProgress.objects.filter(
			is_completed=True,
			user__role='student',
			user__is_active=True
		).select_related('user', 'quest', 'quest__target_building').order_by('-completed_at')[:5]

		data = []
		for r in recent:
			data.append({
				'username': r.user.username,
				'quest_title': r.quest.title,
				'building_name': r.quest.target_building.name if r.quest.target_building else 'Unknown Location',
				'points': r.quest.reward_points,
				'time_ago': r.completed_at.isoformat()
			})

		return Response({
			'success': True,
			'data': data
		})


class MyBadgesView(views.APIView):
	permission_classes = [IsAuthenticated, IsStudentRole]

	def get(self, request):
		user_badges = UserBadge.objects.filter(user=request.user).select_related('badge')
		serializer = UserBadgeSerializer(user_badges, many=True)
		return Response({'success': True, 'data': serializer.data})


class AllBadgesView(views.APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		all_badges = Badge.objects.filter(is_active=True)
		earned_ids = set(UserBadge.objects.filter(user=request.user).values_list('badge_id', flat=True))
		data = []
		for badge in all_badges:
			badge_data = BadgeSerializer(badge).data
			badge_data['earned'] = badge.id in earned_ids
			data.append(badge_data)
		return Response({'success': True, 'data': data})

class MyQuestHistoryView(views.APIView):
	permission_classes = [IsAuthenticated, IsStudentRole]

	def get(self, request):
		recent = UserQuestProgress.objects.filter(
			is_completed=True,
			user=request.user
		).select_related('quest', 'quest__target_building').order_by('-completed_at')[:10]

		data = []
		for r in recent:
			data.append({
				'quest_title': r.quest.title,
				'building_name': r.quest.target_building.name if r.quest.target_building else 'Unknown Location',
				'points': r.quest.reward_points,
				'time_ago': r.completed_at.isoformat()
			})

		return Response({
			'success': True,
			'data': data
		})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quest_list_create(request):
    if request.method == 'GET':
        quests = Quest.objects.all().order_by('-created_at')
        return success_response(QuestSerializer(quests, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        from apps.api.models import SystemSetting
        if 'reward_points' not in request.data or not request.data.get('reward_points'):
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            request.data['reward_points'] = SystemSetting.get_settings().default_quest_reward
            
        serializer = QuestSerializer(data=request.data)
        if serializer.is_valid():
            quest = serializer.save()
            
            # Send Push Notification
            try:
                from apps.authentication.models import UserDevice
                from apps.core.notifications import send_push_notifications
                
                tokens = UserDevice.objects.values_list('push_token', flat=True)
                
                if tokens:
                    messages = [{
                        "to": token,
                        "title": f"New Quest: {quest.title}",
                        "body": "Tap to view your new mission!",
                        "data": {"type": "quest", "quest_id": str(quest.id)}
                    } for token in set(tokens)]
                    
                    send_push_notifications(messages)
            except Exception as e:
                print(f"Error sending notifications: {e}")
                
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def quest_detail(request, id):
    if not request.user.is_admin_role:
        return error_response(ErrorCodes.PERMISSION_DENIED, 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    try:
        quest = Quest.objects.get(id=id)
    except Quest.DoesNotExist:
        return error_response(ErrorCodes.NOT_FOUND, 'Quest not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = QuestSerializer(quest, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response(ErrorCodes.VALIDATION_ERROR, 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    elif request.method == 'DELETE':
        quest.delete()
        return success_response({'message': 'Quest deleted'})
