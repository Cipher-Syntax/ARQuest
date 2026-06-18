from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from apps.authentication.permissions import IsAdminRole
from apps.api.responses import success_response, error_response
from apps.geofencing.serializers import LocationValidationSerializer
from apps.geofencing.utils import calculate_distance
from .models import Building, Geofence, BuildingUnlock, BuildingAsset
from .serializers import (
    BuildingSerializer, 
    BuildingWriteSerializer,
    GeofenceSerializer,
    GeofenceWriteSerializer,
    BuildingUnlockSerializer,
    UnlockedBuildingSerializer,
    BuildingAssetSerializer
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def building_list_create(request):
    if request.method == 'GET':
        buildings = Building.objects.filter(is_active=True)
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
        if not building.is_active and not request.user.is_admin_role:
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

    active_buildings = Building.objects.filter(is_active=True).prefetch_related('geofences')
    
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
            unlock, created = BuildingUnlock.objects.get_or_create(
                user=request.user,
                building=building,
                defaults={'source': 'geofence'}
            )
            if not created:
                unlock.last_validated_at = timezone.now()
                unlock.save(update_fields=['last_validated_at'])
            
            serializer = BuildingUnlockSerializer(unlock)
            return success_response(serializer.data)
    
    return error_response('NOT_IN_GEOFENCE', 'Not inside any building geofence', status_code=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unlocked_buildings(request):
    user = request.user
    
    if user.is_professional_role:
        buildings = Building.objects.filter(is_active=True)
        serializer = UnlockedBuildingSerializer(buildings, many=True, context={'request': request})
        return success_response(serializer.data)
    
    unlocks = BuildingUnlock.objects.filter(user=user).select_related('building').filter(building__is_active=True)
    buildings_data = []
    for unlock in unlocks:
        serializer = UnlockedBuildingSerializer(unlock.building, context={'request': request})
        building_data = serializer.data
        building_data['is_unlocked'] = True
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
        
    if not building.is_active and not request.user.is_admin_role:
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
    if not building.is_active and not request.user.is_admin_role:
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

from .models import Quest, TriviaFact
from .serializers import QuestSerializer, TriviaFactSerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def quest_list_create(request):
    if request.method == 'GET':
        quests = Quest.objects.all().order_by('-created_at')
        return success_response(QuestSerializer(quests, many=True).data)
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        serializer = QuestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
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
