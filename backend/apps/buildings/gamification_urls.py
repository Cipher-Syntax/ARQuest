from django.urls import path
from . import gamification_views

urlpatterns = [
    path('leaderboard/', gamification_views.LeaderboardView.as_view(), name='leaderboard'),
    path('quests/active/', gamification_views.ActiveQuestsView.as_view(), name='active-quests'),
    path('quests/<int:pk>/complete/', gamification_views.CompleteQuestView.as_view(), name='complete-quest'),
]
