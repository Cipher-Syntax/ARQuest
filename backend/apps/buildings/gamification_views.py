from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Quest, UserQuestProgress
from .gamification_serializers import LeaderboardSerializer, QuestSerializer

User = get_user_model()

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
        
        available_quests = list(Quest.objects.filter(is_active=True).exclude(id__in=completed_quest_ids))
        
        if not available_quests:
            return Response({'success': True, 'data': []})

        # 2. Seed the random generator with the user ID and the current date
        # This guarantees the user gets the EXACT same random quest all day long, but it changes at midnight!
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

        return Response({
            'success': True,
            'data': {
                'message': f'Quest completed! You earned {quest.reward_points} points.',
                'total_points': user.exploration_points
            }
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
