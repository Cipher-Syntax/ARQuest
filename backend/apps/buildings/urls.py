from django.urls import path
from . import views
from apps.panorama import views as panorama_views

urlpatterns = [
    path('departments/', views.department_list_create, name='department_list_create'),
    path('departments/<uuid:id>/', views.department_detail, name='department_detail'),
    path('archived/', views.building_archived_list, name='building_archived_list'),
    path('cron/cleanup/', views.cron_cleanup, name='cron_cleanup'),
    path('', views.building_list_create, name='building_list_create'),
    path('<uuid:id>/', views.building_detail, name='building_detail'),
    path('<uuid:pk>/restore/', views.building_restore, name='building_restore'),
    path('<uuid:pk>/hard-delete/', views.building_hard_delete, name='building_hard_delete'),
    path('<uuid:id>/geofence/', views.building_geofence, name='building_geofence'),
    path('geofence/<uuid:id>/', views.geofence_update, name='geofence_update'),
    path('buildings/<uuid:id>/metadata/', views.asset_metadata, name='asset_metadata'),
    path('unlock/', views.unlock_building, name='unlock_building'),
    path('unlock/qr/', views.unlock_building_qr, name='unlock_building_qr'),
    path('unlocked/', views.unlocked_buildings, name='unlocked_buildings'),
    path('<uuid:id>/panorama/', panorama_views.building_panorama_walkthrough, name='building_panorama'),
    path('<uuid:id>/assets/', views.building_assets, name='building_assets'),
    path('quests/', views.quest_list_create, name='quest_list_create'),
    path('quests/<uuid:id>/', views.quest_detail, name='quest_detail'),
    path('trivias/', views.trivia_list_create, name='trivia_list_create'),
    path('trivias/<uuid:id>/', views.trivia_detail, name='trivia_detail'),
    path('quiz-questions/', views.quiz_question_list_create, name='quiz_question_list_create'),
    path('quiz-questions/<uuid:pk>/', views.quiz_question_detail, name='quiz_question_detail'),
    path('<uuid:id>/quiz/', views.building_quiz, name='building_quiz'),
    path('quiz/answer/', views.submit_quiz_answer, name='submit_quiz_answer'),
]
