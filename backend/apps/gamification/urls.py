from django.urls import path
from . import views

urlpatterns = [
	path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
	path('challenges/', views.ChallengesView.as_view(), name='challenges'),
	path('quests/active/', views.ActiveQuestsView.as_view(), name='active-quests'),
	path('quests/<uuid:pk>/complete/', views.CompleteQuestView.as_view(), name='complete-quest'),
	path('recent-activity/', views.RecentActivityView.as_view(), name='recent-activity'),
	path('quests/history/', views.MyQuestHistoryView.as_view(), name='quest-history'),
	path('badges/', views.AllBadgesView.as_view(), name='all-badges'),
	path('badges/my/', views.MyBadgesView.as_view(), name='my-badges'),
]
