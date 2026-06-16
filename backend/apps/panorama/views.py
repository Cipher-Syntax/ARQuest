from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from apps.buildings.models import Building
from apps.api.responses import success_response, error_response
from .models import PanoramaScene, PanoramaHotspot
from .serializers import PanoramaSceneSerializer, PanoramaWalkthroughSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_panorama_walkthrough(request, id):
    try:
        building = Building.objects.get(id=id, is_active=True)
    except Building.DoesNotExist:
        return error_response('not_found', 'Building not found', status_code=status.HTTP_404_NOT_FOUND)
    
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
    
    serializer = PanoramaSceneSerializer(scene, context={'request': request})
    return success_response(serializer.data)
