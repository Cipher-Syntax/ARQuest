"""
A* routing algorithm on the WMSU NavigationNode/NavigationPath graph.
"""
import heapq
import math


def haversine_distance(lat1, lng1, lat2, lng2):
    """Straight-line geographic distance in metres between two GPS points."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_node(nodes, lat, lng):
    """Return the NavigationNode closest to the given GPS coordinates."""
    return min(nodes, key=lambda n: haversine_distance(lat, lng, n.latitude, n.longitude))


def astar(nodes_qs, paths_qs, start_node, end_node):
    """
    A* pathfinding across the WMSU NavigationNode/NavigationPath graph.

    Returns an ordered list of NavigationPath objects forming the route,
    or None if no route exists.
    """
    node_map = {str(n.id): n for n in nodes_qs}

    # Build adjacency list: node_id -> [(neighbour_node_id, path), ...]
    adjacency = {str(n.id): [] for n in nodes_qs}
    for path in paths_qs:
        if path.is_active:
            sid = str(path.start_node_id)
            eid = str(path.end_node_id)
            adjacency[sid].append((eid, path))
            adjacency[eid].append((sid, path))  # bidirectional

    start_id = str(start_node.id)
    end_id = str(end_node.id)
    end_node_obj = node_map[end_id]

    # Priority queue entries: (f_score, node_id, path_history)
    heap = [(0.0, start_id, [])]
    g_scores = {start_id: 0.0}

    while heap:
        f, current_id, path_history = heapq.heappop(heap)

        if current_id == end_id:
            return path_history

        current_g = g_scores.get(current_id, float('inf'))

        # Skip stale entries
        if f > current_g + haversine_distance(
            node_map[current_id].latitude, node_map[current_id].longitude,
            end_node_obj.latitude, end_node_obj.longitude,
        ):
            pass  # still process — heuristic may differ

        for neighbour_id, path in adjacency.get(current_id, []):
            tentative_g = g_scores.get(current_id, float('inf')) + path.distance_meters
            if tentative_g < g_scores.get(neighbour_id, float('inf')):
                g_scores[neighbour_id] = tentative_g
                neighbour_node = node_map[neighbour_id]
                h = haversine_distance(
                    neighbour_node.latitude, neighbour_node.longitude,
                    end_node_obj.latitude, end_node_obj.longitude,
                )
                heapq.heappush(heap, (tentative_g + h, neighbour_id, path_history + [path]))

    return None  # No route found
