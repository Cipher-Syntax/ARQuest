import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.authentication.permissions import IsAdminRole
from apps.buildings.models import Building
from .models import NavigationNode, NavigationPath
from .serializers import NavigationNodeSerializer, NavigationPathSerializer
from .router import astar, find_nearest_node, haversine_distance

logger = logging.getLogger(__name__)

WALKING_SPEED_MPS = 80 / 60  # 80 m/min → m/s


# ---------------------------------------------------------------------------
# Route endpoint (all authenticated users)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def route(request):
    """
    GET /api/navigation/route/
        ?from_lat=<float>
        &from_lng=<float>
        &to_building_id=<uuid>

    Returns a GeoJSON FeatureCollection with a LineString of the calculated
    pedestrian route from the user's GPS location to the target building.
    Falls back to a straight-line if no route is found in the graph.
    """
    from_lat = request.query_params.get('from_lat')
    from_lng = request.query_params.get('from_lng')
    to_building_id = request.query_params.get('to_building_id')

    # --- Validate inputs ---
    if not from_lat or not from_lng or not to_building_id:
        return Response(
            {'success': False, 'error': 'from_lat, from_lng, and to_building_id are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        from_lat = float(from_lat)
        from_lng = float(from_lng)
    except ValueError:
        return Response(
            {'success': False, 'error': 'from_lat and from_lng must be valid numbers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --- Fetch destination building ---
    try:
        building = Building.objects.get(pk=to_building_id, is_active=True)
    except Building.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Building not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Retrieve active graph
    nodes_qs = list(NavigationNode.objects.filter(is_active=True).select_related('building'))
    paths_qs = list(NavigationPath.objects.filter(is_active=True).select_related('start_node', 'end_node'))

    # No nodes available in graph
    if not nodes_qs:
        return Response(
            {'success': False, 'error': 'No navigation network defined.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # --- Find nearest start node to user position ---
    start_node = find_nearest_node(nodes_qs, from_lat, from_lng)

    # --- Find destination node linked to the building (entrance type preferred) ---
    destination_nodes = [n for n in nodes_qs if n.building_id and str(n.building_id) == str(to_building_id)]
    if not destination_nodes:
        # No linked node: fall back to the node nearest to the building's coordinates
        destination_nodes = nodes_qs
    end_node = find_nearest_node(
        destination_nodes,
        float(building.latitude),
        float(building.longitude),
    )

    # If start == end, return a direct two-point route
    if str(start_node.id) == str(end_node.id):
        coords = [[from_lng, from_lat], [float(building.longitude), float(building.latitude)]]
        dist = haversine_distance(from_lat, from_lng, float(building.latitude), float(building.longitude))
        return _route_response(coords, dist)

    # --- Run A* ---
    path_list = astar(nodes_qs, paths_qs, start_node, end_node)

    if path_list is None:
        # No route found in the graph — return 404 error so mobile can trigger straight-line fallback
        return Response(
            {'success': False, 'error': 'No walkable path found between locations.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # --- Assemble ordered coordinate list from path geometries ---
    coords = [[from_lng, from_lat]]
    curr_node_id = str(start_node.id)

    for path in path_list:
        if str(path.start_node_id) == curr_node_id:
            segment_coords = list(path.geometry)
            curr_node_id = str(path.end_node_id)
        else:
            segment_coords = list(reversed(path.geometry))
            curr_node_id = str(path.start_node_id)

        for pt in segment_coords:
            if not coords or coords[-1] != pt:
                coords.append(pt)

    dest_coord = [float(building.longitude), float(building.latitude)]
    if not coords or coords[-1] != dest_coord:
        coords.append(dest_coord)

    total_distance = sum(p.distance_meters for p in path_list)
    return _route_response(coords, total_distance)


def _route_response(coords, distance_meters, fallback=False):
    estimated_minutes = max(1, round(distance_meters / 80))  # 80 m/min pace
    geojson = {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': coords,
            },
            'properties': {
                'distance_meters': round(distance_meters),
                'estimated_minutes': estimated_minutes,
                'fallback': fallback,
            },
        }],
    }
    return Response({'success': True, 'data': geojson})


# ---------------------------------------------------------------------------
# NavigationNode CRUD (admin-only write)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def node_list(request):
    """GET /api/navigation/nodes/  — list all (authenticated)
       POST /api/navigation/nodes/ — create (admin only)"""
    if request.method == 'GET':
        nodes = NavigationNode.objects.select_related('building').all()
        serializer = NavigationNodeSerializer(nodes, many=True)
        return Response({'success': True, 'data': serializer.data})

    # POST — admin only
    if not (request.user.is_authenticated and request.user.role == 'admin'):
        return Response({'success': False, 'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = NavigationNodeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)
    return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def node_detail(request, pk):
    """GET  /api/navigation/nodes/<id>/  — retrieve (authenticated)
       PATCH /api/navigation/nodes/<id>/ — update (admin only)
       DELETE /api/navigation/nodes/<id>/ — delete (admin only)"""
    try:
        node = NavigationNode.objects.select_related('building').get(pk=pk)
    except NavigationNode.DoesNotExist:
        return Response({'success': False, 'error': 'Node not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': NavigationNodeSerializer(node).data})

    # Mutating operations — admin only
    if not (request.user.is_authenticated and request.user.role == 'admin'):
        return Response({'success': False, 'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = NavigationNodeSerializer(node, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': serializer.data})
        return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        node.delete()
        return Response({'success': True, 'data': None}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# NavigationPath CRUD (admin-only write)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def path_list(request):
    """GET /api/navigation/paths/  — list all (authenticated)
       POST /api/navigation/paths/ — create (admin only)"""
    if request.method == 'GET':
        paths = NavigationPath.objects.select_related('start_node', 'end_node').all()
        serializer = NavigationPathSerializer(paths, many=True)
        return Response({'success': True, 'data': serializer.data})

    # POST — admin only
    if not (request.user.is_authenticated and request.user.role == 'admin'):
        return Response({'success': False, 'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = NavigationPathSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)
    return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def path_detail(request, pk):
    """GET  /api/navigation/paths/<id>/  — retrieve (authenticated)
       PATCH /api/navigation/paths/<id>/ — update (admin only)
       DELETE /api/navigation/paths/<id>/ — delete (admin only)"""
    try:
        nav_path = NavigationPath.objects.select_related('start_node', 'end_node').get(pk=pk)
    except NavigationPath.DoesNotExist:
        return Response({'success': False, 'error': 'Path not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': NavigationPathSerializer(nav_path).data})

    # Mutating operations — admin only
    if not (request.user.is_authenticated and request.user.role == 'admin'):
        return Response({'success': False, 'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = NavigationPathSerializer(nav_path, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': serializer.data})
        return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        nav_path.delete()
        return Response({'success': True, 'data': None}, status=status.HTTP_200_OK)
