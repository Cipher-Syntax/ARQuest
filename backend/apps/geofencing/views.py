from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.api.responses import success_response, error_response
from apps.api.errors import ErrorCodes
from apps.buildings.models import Building, Geofence
from .serializers import LocationValidationSerializer
from .utils import calculate_distance

class ValidateLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LocationValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(ErrorCodes.INVALID_INPUT, 'Invalid location data', status_code=400, details=serializer.errors)

        user_lat = serializer.validated_data['latitude']
        user_lon = serializer.validated_data['longitude']
        accuracy = serializer.validated_data['accuracy_meters']

        visible_buildings = Building.objects.filter(status__in=['VISIBLE', 'MAINTENANCE']).prefetch_related('geofences')
        
        matched_building = None
        min_distance = float('inf')
        status = 'outside'

        for building in visible_buildings:
            geofence = building.geofences.filter(is_active=True).first()
            if not geofence:
                continue

            distance = calculate_distance(
                user_lat, user_lon,
                float(geofence.latitude), float(geofence.longitude)
            )

            if distance < min_distance:
                min_distance = distance
                radius = float(geofence.radius_meters)

                if accuracy > 50:
                    status = 'weak_signal'
                elif distance <= radius:
                    status = 'inside'
                    matched_building = {
                        'id': building.id,
                        'name': building.name,
                        'slug': building.slug,
                        'status': building.status,
                        'is_active': building.is_active,
                    }
                elif distance <= radius + 20:
                    status = 'nearby'

        result = {
            'status': status,
            'distance_meters': round(min_distance, 2) if min_distance != float('inf') else None,
            'building': matched_building,
        }

        return success_response(result)

