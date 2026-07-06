from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from apps.authentication.permissions import IsAdminRole
from apps.api.responses import success_response, error_response
from apps.geofencing.serializers import LocationValidationSerializer
from apps.geofencing.utils import calculate_distance
from .models import Building, Geofence, BuildingUnlock, BuildingAsset, Department
from .serializers import (
    BuildingSerializer,
    BuildingWriteSerializer,
    GeofenceSerializer,
    GeofenceWriteSerializer,
    BuildingUnlockSerializer,
    UnlockedBuildingSerializer,
    BuildingAssetSerializer,
    DepartmentSerializer,
    DepartmentWriteSerializer
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def department_list_create(request):
    if request.method == 'GET':
        if getattr(request.user, 'is_admin_role', False):
            departments = Department.objects.all()
        else:
            departments = Department.objects.filter(is_active=True)
        serializer = DepartmentSerializer(departments, many=True)
        return success_response(serializer.data)

    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)

        serializer = DepartmentWriteSerializer(data=request.data)
        if serializer.is_valid():
            department = serializer.save()
            return success_response(DepartmentSerializer(department).data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid department data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def department_detail(request, id):
    try:
        department = Department.objects.get(id=id)
    except Department.DoesNotExist:
        return error_response('not_found', 'Department not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = DepartmentSerializer(department)
        return success_response(serializer.data)

    elif request.method == 'PATCH':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)

        serializer = DepartmentWriteSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            department = serializer.save()
            return success_response(DepartmentSerializer(department).data)
        return error_response('validation_error', 'Invalid department data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)

    elif request.method == 'DELETE':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)

        department.delete()
        return success_response({'message': 'Department deleted successfully'}, status_code=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def building_list_create(request):
    if request.method == 'GET':
        if getattr(request.user, 'is_admin_role', False):
            buildings = Building.objects.all()
        else:
            buildings = Building.objects.filter(status='VISIBLE')
        serializer = BuildingSerializer(buildings, many=True, context={'request': request})
        return success_response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        serializer = BuildingWriteSerializer(data=request.data)
        if serializer.is_valid():
            building = serializer.save()
            return success_response(BuildingSerializer(building, context={'request': request}).data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid building data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def building_detail(request, id):
    try:
        building = Building.objects.get(id=id)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        if building.status != 'VISIBLE' and not getattr(request.user, 'is_admin_role', False):
            return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
        serializer = BuildingSerializer(building, context={'request': request})
        return success_response(serializer.data)
    
    elif request.method == 'PATCH':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        serializer = BuildingWriteSerializer(building, data=request.data, partial=True)
        if serializer.is_valid():
            building = serializer.save()
            return success_response(BuildingSerializer(building, context={'request': request}).data)
        return error_response('validation_error', 'Invalid building data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    
    elif request.method == 'DELETE':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        building.delete()
        return success_response({'message': 'Building deleted successfully'}, status_code=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def building_geofence(request, id):
    try:
        building = Building.objects.get(id=id)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        geofence = building.geofences.filter(is_active=True).first()
        if geofence:
            serializer = GeofenceSerializer(geofence)
            return success_response(serializer.data)
        return success_response(None)
    
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        serializer = GeofenceWriteSerializer(data=request.data)
        if serializer.is_valid():
            geofence = serializer.save(building=building)
            return success_response(GeofenceSerializer(geofence).data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid geofence data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)


@api_view(['PATCH'])
@permission_classes([IsAdminRole])
def geofence_update(request, id):
    try:
        geofence = Geofence.objects.get(id=id)
    except Geofence.DoesNotExist:
        return error_response('not_found', 'Geofence not found', status_code=status.HTTP_404_NOT_FOUND)
    
    serializer = GeofenceWriteSerializer(geofence, data=request.data, partial=True)
    if serializer.is_valid():
        geofence = serializer.save()
        return success_response(GeofenceSerializer(geofence).data)
    return error_response('validation_error', 'Invalid geofence data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_building(request):
    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot unlock buildings', status_code=status.HTTP_403_FORBIDDEN)

    serializer = LocationValidationSerializer(data=request.data)
    if not serializer.is_valid():
        return error_response('INVALID_INPUT', 'Invalid location data', status_code=400, details=serializer.errors)

    user_lat = serializer.validated_data['latitude']
    user_lon = serializer.validated_data['longitude']
    accuracy = serializer.validated_data['accuracy_meters']

    active_buildings = Building.objects.filter(is_active=True, status='VISIBLE').prefetch_related('geofences')
    
    for building in active_buildings:
        geofence = building.geofences.filter(is_active=True).first()
        if not geofence:
            continue

        distance = calculate_distance(
            user_lat, user_lon,
            float(geofence.latitude), float(geofence.longitude)
        )

        radius = float(geofence.radius_meters)
        
        if distance <= radius:
            # Server-side Time-Distance Speed Validation
            last_unlock = BuildingUnlock.objects.filter(user=request.user).exclude(building=building).order_by('-last_validated_at').first()
            if last_unlock:
                last_geofence = last_unlock.building.geofences.filter(is_active=True).first()
                if last_geofence:
                    dist_between = calculate_distance(
                        float(geofence.latitude), float(geofence.longitude),
                        float(last_geofence.latitude), float(last_geofence.longitude)
                    )
                    time_diff = (timezone.now() - last_unlock.last_validated_at).total_seconds()
                    if time_diff > 0:
                        speed = dist_between / time_diff
                        if speed > 50:  # > 50 m/s (approx 180 km/h) is impossible walking/driving on campus
                            return error_response('speed_violation', 'Movement too fast, spoofing detected.', status_code=400)

            unlock, created = BuildingUnlock.objects.get_or_create(
                user=request.user,
                building=building,
                defaults={'source': 'geofence'}
            )
            if not created:
                unlock.last_validated_at = timezone.now()
                unlock.save(update_fields=['last_validated_at'])

            newly_earned_badges = []
            if created:
                from apps.buildings.gamification_views import check_and_award_badges
                newly_earned_badges = check_and_award_badges(request.user)

            serializer = BuildingUnlockSerializer(unlock)
            data = serializer.data
            data['newly_earned_badges'] = newly_earned_badges
            return success_response(data)
    
    return error_response('NOT_IN_GEOFENCE', 'Not inside any building geofence', status_code=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_building_qr(request):
    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot unlock buildings', status_code=status.HTTP_403_FORBIDDEN)

    qr_secret = request.data.get('qr_code_secret')
    if not qr_secret:
        return error_response('invalid_input', 'QR code secret is required', status_code=status.HTTP_400_BAD_REQUEST)

    try:
        building = Building.objects.get(qr_code_secret=qr_secret, is_active=True, status='VISIBLE')
    except Building.DoesNotExist:
        return error_response('invalid_qr', 'Invalid or inactive QR code', status_code=status.HTTP_404_NOT_FOUND)

    lat = request.data.get('lat')
    lng = request.data.get('lng')

    if lat and lng:
        geofence = building.geofences.filter(is_active=True).first()
        if geofence:
            distance = calculate_distance(
                float(lat), float(lng),
                float(geofence.latitude), float(geofence.longitude)
            )
            # 50 meter strict threshold for QR
            if distance > 50:
                return error_response('too_far', 'You must be within 50 meters of the building to scan its QR code.', status_code=status.HTTP_400_BAD_REQUEST)

    unlock, created = BuildingUnlock.objects.get_or_create(
        user=request.user,
        building=building,
        defaults={'source': 'qr'}
    )
    if not created:
        unlock.last_validated_at = timezone.now()
        if unlock.source != 'qr':
            unlock.source = 'qr'
            unlock.save(update_fields=['last_validated_at', 'source'])
        else:
            unlock.save(update_fields=['last_validated_at'])

    newly_earned_badges = []
    if created:
        from apps.buildings.gamification_views import check_and_award_badges
        newly_earned_badges = check_and_award_badges(request.user)

    serializer = BuildingUnlockSerializer(unlock)
    data = serializer.data
    data['newly_earned_badges'] = newly_earned_badges
    return success_response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unlocked_buildings(request):
    user = request.user
    
    if user.is_professional_role:
        buildings = Building.objects.filter(status='VISIBLE')
        unlocks_map = {u.building_id: u for u in BuildingUnlock.objects.filter(user=user)}
        
        buildings_data = []
        for b in buildings:
            serializer = UnlockedBuildingSerializer(b, context={'request': request})
            data = serializer.data
            data['is_unlocked'] = True
            if b.id in unlocks_map:
                unlock = unlocks_map[b.id]
                data['visited'] = True
                data['unlocked_at'] = unlock.unlocked_at
                data['unlock_source'] = unlock.source
            else:
                data['visited'] = False
                data['unlocked_at'] = None
                data['unlock_source'] = 'role_access'
            buildings_data.append(data)
        
        return success_response(buildings_data)
    
    unlocks = BuildingUnlock.objects.filter(user=user).select_related('building').filter(building__status='VISIBLE')
    buildings_data = []
    for unlock in unlocks:
        serializer = UnlockedBuildingSerializer(unlock.building, context={'request': request})
        building_data = serializer.data
        building_data['is_unlocked'] = True
        building_data['visited'] = True
        building_data['unlock_source'] = unlock.source
        building_data['unlocked_at'] = unlock.unlocked_at
        buildings_data.append(building_data)
    
    return success_response(buildings_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_assets(request, id):
    try:
        building = Building.objects.get(id=id)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
        
    if building.status != 'VISIBLE' and not getattr(request.user, 'is_admin_role', False):
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot access heavy assets', status_code=status.HTTP_403_FORBIDDEN)

    if request.user.is_student_role:
        is_unlocked = BuildingUnlock.objects.filter(user=request.user, building=building).exists()
        if not is_unlocked:
            return error_response('permission_denied', 'You must unlock this building first', status_code=status.HTTP_403_FORBIDDEN)
            
    assets = BuildingAsset.objects.filter(building=building, is_active=True)
    serializer = BuildingAssetSerializer(assets, many=True, context={'request': request})
    return success_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_metadata(request, id):
    try:
        asset = BuildingAsset.objects.select_related('building').get(id=id)
    except BuildingAsset.DoesNotExist:
        return error_response('not_found', 'Asset not found', status_code=status.HTTP_404_NOT_FOUND)

    building = asset.building
    if building.status != 'VISIBLE' and not getattr(request.user, 'is_admin_role', False):
         return error_response('not_found', 'Asset not found', status_code=status.HTTP_404_NOT_FOUND)
         
    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot access heavy assets', status_code=status.HTTP_403_FORBIDDEN)

    if request.user.is_student_role:
        is_unlocked = BuildingUnlock.objects.filter(user=request.user, building=building).exists()
        if not is_unlocked:
            return error_response('permission_denied', 'You must unlock this building first', status_code=status.HTTP_403_FORBIDDEN)

    if not asset.is_active and not request.user.is_admin_role:
        return error_response('not_found', 'Asset not found', status_code=status.HTTP_404_NOT_FOUND)

    serializer = BuildingAssetSerializer(asset, context={'request': request})
    return success_response(serializer.data)


# Quests and Trivias

from .models import Quest, TriviaFact, QuizQuestion
from .serializers import QuestSerializer, TriviaFactSerializer
from .gamification_serializers import QuizQuestionSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quest_list_create(request):
    if request.method == 'GET':
        quests = Quest.objects.all().order_by('-created_at')
        return success_response(QuestSerializer(quests, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        from apps.api.models import SystemSetting
        if 'reward_points' not in request.data or not request.data.get('reward_points'):
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True
            request.data['reward_points'] = SystemSetting.get_settings().default_quest_reward
            
        serializer = QuestSerializer(data=request.data)
        if serializer.is_valid():
            quest = serializer.save()
            
            # Send Push Notification
            try:
                from apps.authentication.models import UserDevice
                from apps.core.notifications import send_push_notifications
                
                # Filter tokens based on target_role
                if quest.target_role == 'all':
                    tokens = UserDevice.objects.values_list('push_token', flat=True)
                else:
                    tokens = UserDevice.objects.filter(user__role=quest.target_role).values_list('push_token', flat=True)
                
                if tokens:
                    messages = [{
                        "to": token,
                        "title": f"New Quest: {quest.title}",
                        "body": "Tap to view your new mission!",
                        "data": {"type": "quest", "quest_id": str(quest.id)}
                    } for token in set(tokens)]
                    
                    send_push_notifications(messages)
            except Exception as e:
                print(f"Error sending notifications: {e}")
                
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def quest_detail(request, id):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    try:
        quest = Quest.objects.get(id=id)
    except Quest.DoesNotExist:
        return error_response('not_found', 'Quest not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = QuestSerializer(quest, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    elif request.method == 'DELETE':
        quest.delete()
        return success_response({'message': 'Quest deleted'})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def trivia_list_create(request):
    if request.method == 'GET':
        building_id = request.query_params.get('building_id')
        if building_id:
            trivias = TriviaFact.objects.filter(building_id=building_id).order_by('-created_at')
        else:
            trivias = TriviaFact.objects.all().order_by('-created_at')
        return success_response(TriviaFactSerializer(trivias, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        serializer = TriviaFactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def trivia_detail(request, id):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
    try:
        trivia = TriviaFact.objects.get(id=id)
    except TriviaFact.DoesNotExist:
        return error_response('not_found', 'Trivia not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = TriviaFactSerializer(trivia, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
    elif request.method == 'DELETE':
        trivia.delete()
        return success_response({'message': 'Trivia deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_quiz(request, id):
    try:
        building = Building.objects.get(id=id, is_active=True, status='VISIBLE')
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
    
    from .models import UserQuizProgress
    answered_ids = UserQuizProgress.objects.filter(user=request.user, is_correct=True).values_list('question_id', flat=True)
    questions = list(QuizQuestion.objects.filter(building=building, is_active=True).exclude(id__in=answered_ids))
    
    import random
    if len(questions) > 3:
        questions = random.sample(questions, 3)
    
    serializer = QuizQuestionSerializer(questions, many=True)
    return success_response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_quiz_answer(request):
    question_id = request.data.get('question_id')
    selected_option = request.data.get('selected_option')
    
    if not question_id or not selected_option:
        return error_response('invalid_input', 'Missing question_id or selected_option', status_code=status.HTTP_400_BAD_REQUEST)
    
    try:
        question = QuizQuestion.objects.get(id=question_id, is_active=True)
    except QuizQuestion.DoesNotExist:
        return error_response('not_found', 'Question not found', status_code=status.HTTP_404_NOT_FOUND)
        
    is_correct = (selected_option == question.correct_option)
    exp_awarded = 0
    newly_earned_badges = []
    
    from .models import UserQuizProgress
    with transaction.atomic():
        progress, created = UserQuizProgress.objects.get_or_create(user=request.user, question=question)
        progress = UserQuizProgress.objects.select_for_update().get(id=progress.id)
        
        if progress.is_correct:
            return success_response({
                'is_correct': True,
                'correct_option': question.correct_option,
                'exp_awarded': 0,
                'newly_earned_badges': [],
                'message': 'You have already completed this trivia question.'
            })
        
        if is_correct:
            progress.is_correct = True
            progress.save(update_fields=['is_correct'])
            user = request.user.__class__.objects.select_for_update().get(id=request.user.id)
            user.exploration_points += question.exp_reward
            user.save(update_fields=['exploration_points'])
            exp_awarded = question.exp_reward
            
            from apps.buildings.gamification_views import check_and_award_badges
            newly_earned_badges = check_and_award_badges(user)
        
    return success_response({
        'is_correct': is_correct,
        'correct_option': question.correct_option,
        'exp_awarded': exp_awarded,
        'newly_earned_badges': newly_earned_badges
    })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quiz_question_list_create(request):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
    if request.method == 'GET':
        building_id = request.query_params.get('building_id')
        if building_id:
            questions = QuizQuestion.objects.filter(building_id=building_id).order_by('-created_at')
        else:
            questions = QuizQuestion.objects.all().order_by('-created_at')
        return success_response(QuizQuestionSerializer(questions, many=True).data)
        
    elif request.method == 'POST':
        serializer = QuizQuestionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def quiz_question_detail(request, pk):
    if not request.user.is_admin_role:
        return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
    try:
        question = QuizQuestion.objects.get(id=pk)
    except QuizQuestion.DoesNotExist:
        return error_response('not_found', 'Question not found', status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = QuizQuestionSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response('validation_error', 'Invalid data', status_code=status.HTTP_400_BAD_REQUEST, details=serializer.errors)
        
    elif request.method == 'DELETE':
        question.delete()
        return success_response({'message': 'Question deleted'})

from django.conf import settings
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
def building_archived_list(request):
    if getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_staff', False):
        return Response({"error": "Forbidden"}, status=403)
    archived = Building.all_objects.filter(deleted_at__isnull=False)
    serializer = BuildingSerializer(archived, many=True, context={'request': request})
    return Response({"success": True, "data": serializer.data})

@api_view(['POST'])
def building_restore(request, pk):
    if getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_staff', False):
        return Response({"error": "Forbidden"}, status=403)
    try:
        building = Building.all_objects.get(pk=pk, deleted_at__isnull=False)
        building.restore()
        return Response({"success": True})
    except Building.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

@api_view(['DELETE'])
def building_hard_delete(request, pk):
    if getattr(request.user, 'role', None) != 'admin' and not getattr(request.user, 'is_staff', False):
        return Response({"error": "Forbidden"}, status=403)
    try:
        building = Building.all_objects.get(pk=pk, deleted_at__isnull=False)
        building.hard_delete()
        return Response({"success": True})
    except Building.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def cron_cleanup(request):
    secret = request.headers.get('X-Cron-Secret')
    expected = getattr(settings, 'CRON_SECRET_KEY')
    if secret != expected:
        return Response({"error": "Forbidden"}, status=403)
    
    threshold = timezone.now() - timedelta(days=30)
    old_buildings = Building.all_objects.filter(deleted_at__lt=threshold)
    count = old_buildings.count()
    for b in old_buildings:
        b.hard_delete()
        
    return Response({"success": True, "deleted": count}, status=204)
