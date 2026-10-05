from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.gamification.models import Quest, UserQuestProgress, Badge, UserBadge


User = get_user_model()

class LeaderboardSerializer(serializers.ModelSerializer):
	rank = serializers.SerializerMethodField()
	points = serializers.IntegerField(source='exploration_points')
	rank_info = serializers.SerializerMethodField()
	quests_completed = serializers.SerializerMethodField()
	profile_image = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = ['id', 'username', 'first_name', 'last_name', 'points', 'rank', 'rank_info', 'quests_completed', 'avatar_id', 'profile_image']

	def get_rank(self, obj):
		return self.context.get('rank', 0)

	def get_rank_info(self, obj):
		from .utils import get_rank_info
		return get_rank_info(obj.exploration_points)

	def get_quests_completed(self, obj):
		return getattr(obj, 'quests_completed_count', 0)

	def get_profile_image(self, obj):
		if obj.profile_image:
			request = self.context.get('request')
			if request:
				return request.build_absolute_uri(obj.profile_image.url)
			return obj.profile_image.url
		return None

class QuestSerializer(serializers.ModelSerializer):
	target_building_name = serializers.CharField(source='target_building.name', read_only=True)
	is_completed = serializers.SerializerMethodField()

	class Meta:
		model = Quest
		fields = ['id', 'title', 'hint', 'target_building', 'target_building_name', 'reward_points', 'difficulty', 'is_completed', 'expires_at', 'created_at', 'deleted_at']

	def to_internal_value(self, data):
		if isinstance(data, dict) and 'difficulty' in data and isinstance(data['difficulty'], str):
			data = data.copy()
			data['difficulty'] = data['difficulty'].upper()
		return super().to_internal_value(data)

	def get_is_completed(self, obj):
		completed_ids = self.context.get('completed_quest_ids')
		if completed_ids is not None:
			return obj.id in completed_ids
			
		request = self.context.get('request')
		if request and hasattr(request, 'user') and request.user.is_authenticated:
			return UserQuestProgress.objects.filter(user=request.user, quest=obj, is_completed=True).exists()
		return False


class BadgeSerializer(serializers.ModelSerializer):
	class Meta:
		model = Badge
		fields = ['id', 'name', 'description', 'icon', 'color_hex', 'trigger']


class UserBadgeSerializer(serializers.ModelSerializer):
	badge = BadgeSerializer()
	earned_at = serializers.DateTimeField()

	class Meta:
		model = UserBadge
		fields = ['id', 'badge', 'earned_at']

