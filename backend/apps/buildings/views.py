from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Building
from .serializers import BuildingSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_list(request):
    buildings = Building.objects.filter(is_active=True)
    serializer = BuildingSerializer(buildings, many=True)
    return Response({
        'success': True,
        'data': serializer.data,
        'error': None
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def building_detail(request, id):
    try:
        building = Building.objects.get(id=id, is_active=True)
        serializer = BuildingSerializer(building)
        return Response({
            'success': True,
            'data': serializer.data,
            'error': None
        })
    except Building.DoesNotExist:
        return Response({
            'success': False,
            'data': None,
            'error': 'Building not found'
        }, status=status.HTTP_404_NOT_FOUND)
