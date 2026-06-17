from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Quest, UserQuestProgress


User = get_user_model()

class LeaderboardSerializer(serializers.ModelSerializer):
    rank = serializers.SerializerMethodField()
    points = serializers.IntegerField(source='exploration_points')

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'points', 'rank']

    def get_rank(self, obj):
        # The rank is passed from the view context
        return self.context.get('rank', 0)

class QuestSerializer(serializers.ModelSerializer):
    target_building_name = serializers.CharField(source='target_building.name', read_only=True)
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Quest
        fields = ['id', 'title', 'hint', 'target_building', 'target_building_name', 'reward_points', 'is_completed']

    def get_is_completed(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return UserQuestProgress.objects.filter(user=user, quest=obj, is_completed=True).exists()
        return False
