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
        users = User.objects.filter(is_active=True).order_by('-exploration_points')[:50]
        data = []
        for index, user in enumerate(users):
            serializer = LeaderboardSerializer(user, context={'rank': index + 1})
            data.append(serializer.data)
        
        return Response({
            'success': True,
            'data': data
        })

class ActiveQuestsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quests = Quest.objects.filter(is_active=True)
        serializer = QuestSerializer(quests, many=True, context={'request': request})
        
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
