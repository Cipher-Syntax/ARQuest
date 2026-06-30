from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Quest, UserQuestProgress, Badge, UserBadge, BuildingUnlock, Building
from .gamification_serializers import LeaderboardSerializer, QuestSerializer, BadgeSerializer, UserBadgeSerializer

User = get_user_model()


def check_and_award_badges(user):
	"""Check all badge triggers for a user and award any newly earned badges."""
	newly_earned = []
	active_badges = Badge.objects.filter(is_active=True)
	already_earned_ids = set(UserBadge.objects.filter(user=user).values_list('badge_id', flat=True))

	unlock_count = BuildingUnlock.objects.filter(user=user).count()
	quest_count = UserQuestProgress.objects.filter(user=user, is_completed=True).count()
	total_buildings = Building.objects.filter(is_active=True, status='VISIBLE').count()

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
		users = User.objects.filter(is_active=True, role='student').order_by('-exploration_points')[:50]
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
	permission_classes = [IsAuthenticated]

	def get(self, request):
		user = request.user

		# 1. Get all active quests the user HAS NOT completed
		completed_quest_ids = UserQuestProgress.objects.filter(
			user=user, is_completed=True
		).values_list('quest_id', flat=True)

		from django.db.models import Q
		available_quests = list(Quest.objects.filter(is_active=True).filter(
			Q(target_role='all') | Q(target_role=user.role)
		).exclude(id__in=completed_quest_ids))

		if not available_quests:
			return Response({'success': True, 'data': []})

		# 2. Seed the random generator with the user ID and the current date
		today_str = date.today().isoformat()
		random.seed(f"{user.id}-{today_str}")

		# 3. Select 1 Daily Quest
		daily_quest = random.choice(available_quests)

		# Reset the seed for the rest of the application
		random.seed()

		serializer = QuestSerializer([daily_quest], many=True, context={'request': request})

		return Response({
			'success': True,
			'data': serializer.data
		})


class CompleteQuestView(views.APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, pk):
		try:
			quest = Quest.objects.get(pk=pk, is_active=True)
		except Quest.DoesNotExist:
			return Response({
				'success': False,
				'error': 'Quest not found or inactive'
			}, status=status.HTTP_404_NOT_FOUND)

		progress, created = UserQuestProgress.objects.get_or_create(
			user=request.user,
			quest=quest
		)

		if progress.is_completed:
			return Response({
				'success': False,
				'error': 'Quest already completed'
			}, status=status.HTTP_400_BAD_REQUEST)

		# Mark completed and award points
		progress.is_completed = True
		progress.completed_at = timezone.now()
		progress.save()

		user = request.user
		user.exploration_points += quest.reward_points
		user.save()

		# Check and award badges
		newly_earned_badges = check_and_award_badges(user)

		from apps.api.models import SystemSetting
		from .serializers import TriviaFactSerializer

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

		from apps.buildings.gamification_utils import get_rank_info
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
	permission_classes = [IsAuthenticated]

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
	permission_classes = [IsAuthenticated]

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
