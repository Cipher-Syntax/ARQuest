from django.urls import path
from . import gamification_views

urlpatterns = [
	path('leaderboard/', gamification_views.LeaderboardView.as_view(), name='leaderboard'),
	path('quests/active/', gamification_views.ActiveQuestsView.as_view(), name='active-quests'),
	path('quests/<int:pk>/complete/', gamification_views.CompleteQuestView.as_view(), name='complete-quest'),
	path('recent-activity/', gamification_views.RecentActivityView.as_view(), name='recent-activity'),
	path('quests/history/', gamification_views.MyQuestHistoryView.as_view(), name='quest-history'),
	path('badges/', gamification_views.AllBadgesView.as_view(), name='all-badges'),
	path('badges/my/', gamification_views.MyBadgesView.as_view(), name='my-badges'),
]
