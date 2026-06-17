from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.buildings.models import Building
from apps.api.responses import success_response, error_response
from .models import PanoramaScene, PanoramaHotspot
from .serializers import (
    PanoramaSceneSerializer, 
    PanoramaWalkthroughSerializer, 
    PanoramaSceneWriteSerializer,
    PanoramaHotspotWriteSerializer
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_panorama_walkthrough(request, id):
    try:
        building = Building.objects.get(id=id, is_active=True)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
        
    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot access panoramas', status_code=status.HTTP_403_FORBIDDEN)
        
    if request.user.is_student_role:
        from apps.buildings.models import BuildingUnlock
        is_unlocked = BuildingUnlock.objects.filter(user=request.user, building=building).exists()
        if not is_unlocked:
            return error_response('permission_denied', 'You must unlock this building first', status_code=status.HTTP_403_FORBIDDEN)
    
    # Get active scenes for this building
    active_scenes = PanoramaScene.objects.filter(
        building=building,
        is_active=True
    ).prefetch_related('hotspots')
    
    if not active_scenes.exists():
        return error_response('not_found', 'No panorama walkthrough available', status_code=status.HTTP_404_NOT_FOUND)
    
    # Get start scene
    start_scene = active_scenes.filter(is_start_scene=True).first()
    if not start_scene:
        # Fallback to first scene if no start scene is marked
        start_scene = active_scenes.first()
    
    # Serialize data
    walkthrough_data = {
        'building_id': building.id,
        'building_name': building.name,
        'start_scene': PanoramaSceneSerializer(start_scene, context={'request': request}).data,
        'scenes': PanoramaSceneSerializer(active_scenes, many=True, context={'request': request}).data
    }
    
    return success_response(walkthrough_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def panorama_scene_detail(request, id):
    try:
        scene = PanoramaScene.objects.get(id=id, is_active=True)
    except PanoramaScene.DoesNotExist:
        return error_response('not_found', 'Scene not found', status_code=status.HTTP_404_NOT_FOUND)
        
    if request.user.is_visitor_role:
        return error_response('permission_denied', 'Visitors cannot access panoramas', status_code=status.HTTP_403_FORBIDDEN)
        
    if request.user.is_student_role:
        from apps.buildings.models import BuildingUnlock
        is_unlocked = BuildingUnlock.objects.filter(user=request.user, building=scene.building).exists()
        if not is_unlocked:
            return error_response('permission_denied', 'You must unlock this building first', status_code=status.HTTP_403_FORBIDDEN)
    
    serializer = PanoramaSceneSerializer(scene, context={'request': request})
    return success_response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def building_scenes_admin(request, building_id):
    try:
        building = Building.objects.get(id=building_id)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
        
    # GET: List all scenes for a building (Admin dashboard needs to see active and inactive)
    if request.method == 'GET':
        scenes = PanoramaScene.objects.filter(building=building).order_by('sort_order')
        serializer = PanoramaSceneSerializer(scenes, many=True, context={'request': request})
        return success_response(serializer.data)
        
    # POST: Create a new scene
    elif request.method == 'POST':
        # Enforce Admin Role
        if getattr(request.user, 'role', '') != 'admin':
            return error_response('forbidden', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
            
        serializer = PanoramaSceneWriteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(building=building)
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def scene_detail_admin(request, id):
    # Enforce Admin Role
    if getattr(request.user, 'role', '') != 'admin':
        return error_response('forbidden', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
    try:
        scene = PanoramaScene.objects.get(id=id)
        scene.delete()
        return success_response({'message': 'Scene deleted successfully'})
    except PanoramaScene.DoesNotExist:
        return error_response('not_found', 'Scene not found', status_code=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def scene_hotspots_admin(request, scene_id):
    # Enforce Admin Role
    if getattr(request.user, 'role', '') != 'admin':
        return error_response('forbidden', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
    try:
        scene = PanoramaScene.objects.get(id=scene_id)
    except PanoramaScene.DoesNotExist:
        return error_response('not_found', 'Scene not found', status_code=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        hotspots = PanoramaHotspot.objects.filter(source_scene=scene)
        from .serializers import PanoramaHotspotSerializer
        serializer = PanoramaHotspotSerializer(hotspots, many=True)
        return success_response(serializer.data)
        
    elif request.method == 'POST':
        serializer = PanoramaHotspotWriteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(source_scene=scene)
            return success_response(serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response('validation_error', serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def hotspot_detail_admin(request, id):
    # Enforce Admin Role
    if getattr(request.user, 'role', '') != 'admin':
        return error_response('forbidden', 'Admin access required', status_code=status.HTTP_403_FORBIDDEN)
        
    try:
        hotspot = PanoramaHotspot.objects.get(id=id)
    except PanoramaHotspot.DoesNotExist:
        return error_response('not_found', 'Hotspot not found', status_code=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'PATCH':
        serializer = PanoramaHotspotWriteSerializer(hotspot, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(serializer.data)
        return error_response('validation_error', serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        hotspot.delete()
        return success_response({'message': 'Hotspot deleted successfully'})