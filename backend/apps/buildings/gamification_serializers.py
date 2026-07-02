from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Quest, UserQuestProgress, Badge, UserBadge, QuizQuestion

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'building', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'exp_reward']


User = get_user_model()

class LeaderboardSerializer(serializers.ModelSerializer):
	rank = serializers.SerializerMethodField()
	points = serializers.IntegerField(source='exploration_points')
	rank_info = serializers.SerializerMethodField()
	quests_completed = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = ['username', 'points', 'rank', 'rank_info', 'quests_completed']

	def get_rank(self, obj):
		return self.context.get('rank', 0)

	def get_rank_info(self, obj):
		from apps.buildings.gamification_utils import get_rank_info
		return get_rank_info(obj.exploration_points)

	def get_quests_completed(self, obj):
		from .models import UserQuestProgress
		return UserQuestProgress.objects.filter(user=obj, is_completed=True).count()

class QuestSerializer(serializers.ModelSerializer):
	target_building_name = serializers.CharField(source='target_building.name', read_only=True)
	is_completed = serializers.SerializerMethodField()

	class Meta:
		model = Quest
		fields = ['id', 'title', 'hint', 'target_building', 'target_building_name', 'target_role', 'reward_points', 'is_completed', 'expires_at']

	def get_is_completed(self, obj):
		user = self.context.get('request').user
		if user.is_authenticated:
			return UserQuestProgress.objects.filter(user=user, quest=obj, is_completed=True).exists()
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

