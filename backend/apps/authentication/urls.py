from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('resend-otp/', views.resend_otp, name='resend_otp'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('me/', views.current_user, name='current_user'),
    path('token/refresh/', views.token_refresh, name='token_refresh'),
    path('users/', views.user_list, name='user_list'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
]
