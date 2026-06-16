from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from apps.authentication.permissions import IsAdminRole
from apps.api.responses import success_response, error_response
from apps.geofencing.serializers import LocationValidationSerializer
from apps.geofencing.utils import calculate_distance
from .models import Building, Geofence, BuildingUnlock
from .serializers import (
    BuildingSerializer, 
    BuildingWriteSerializer,
    GeofenceSerializer,
    GeofenceWriteSerializer,
    BuildingUnlockSerializer,
    UnlockedBuildingSerializer
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def building_list_create(request):
    if request.method == 'GET':
        buildings = Building.objects.filter(is_active=True)
        serializer = BuildingSerializer(buildings, many=True)
        return success_response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        serializer = BuildingWriteSerializer(data=request.data)
        if serializer.is_valid():
            building = serializer.save()
            return success_response(BuildingSerializer(building).data, status_code=status.HTTP_201_CREATED)
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
        serializer = BuildingSerializer(building)
        return success_response(serializer.data)
    
    elif request.method == 'PATCH':
        if not request.user.is_admin_role:
            return error_response('permission_denied', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
        serializer = BuildingWriteSerializer(building, data=request.data, partial=True)
        if serializer.is_valid():
            building = serializer.save()
            return success_response(BuildingSerializer(building).data)
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
        data = []
        for building in buildings:
            data.append({
                'id': building.id,
                'name': building.name,
                'slug': building.slug,
                'description': building.description,
                'latitude': building.latitude,
                'longitude': building.longitude,
                'is_unlocked': True,
                'unlock_source': 'role_access',
                'unlocked_at': None
            })
        return success_response(data)
    
    unlocks = BuildingUnlock.objects.filter(user=user).select_related('building').filter(building__is_active=True)
    data = []
    for unlock in unlocks:
        data.append({
            'id': unlock.building.id,
            'name': unlock.building.name,
            'slug': unlock.building.slug,
            'description': unlock.building.description,
            'latitude': unlock.building.latitude,
            'longitude': unlock.building.longitude,
            'is_unlocked': True,
            'unlock_source': unlock.source,
            'unlocked_at': unlock.unlocked_at
        })
    
    return success_response(data)
