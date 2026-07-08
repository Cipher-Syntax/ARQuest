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
    path('users/professional/', views.create_professional, name='create_professional'),
    path('users/professional/<int:pk>/', views.delete_professional, name='delete_professional'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('checkin/', views.daily_checkin, name='daily_checkin'),
    path('push-token/', views.register_push_token, name='register_push_token'),
]
