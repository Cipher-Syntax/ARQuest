from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.api.responses import success_response, error_response
from apps.api.errors import ErrorCodes
from apps.buildings.models import Building, Geofence
from .serializers import LocationValidationSerializer
from .utils import calculate_distance
from .models import UserLocationTracker

class ValidateLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LocationValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(ErrorCodes.INVALID_INPUT, 'Invalid location data', status_code=400, details=serializer.errors)

        user_lat = serializer.validated_data['latitude']
        user_lon = serializer.validated_data['longitude']
        accuracy = serializer.validated_data['accuracy_meters']

        # --- Anti-Spoofing (Impossible Travel Check) ---
        tracker, created = UserLocationTracker.objects.get_or_create(
            user=request.user,
            defaults={'last_latitude': user_lat, 'last_longitude': user_lon}
        )

        if not created:
            now = timezone.now()
            time_diff = (now - tracker.last_timestamp).total_seconds()
            
            # Only check if enough time has passed and they actually moved a significant distance
            if time_diff > 0:
                dist = calculate_distance(user_lat, user_lon, float(tracker.last_latitude), float(tracker.last_longitude))
                speed = dist / time_diff
                
                # 30 m/s is ~108 km/h. If they travel faster than this over a distance of > 50 meters, it's a spoof
                if speed > 30.0 and dist > 50.0:
                    # Save just the timestamp to prevent them from retrying instantly, but keep the old valid location
                    tracker.save()
                    return error_response(ErrorCodes.SPOOFING_DETECTED, 'Impossible travel velocity detected.', status_code=403)
            
            # Valid movement, update tracker
            tracker.last_latitude = user_lat
            tracker.last_longitude = user_lon
            tracker.save()
        # -----------------------------------------------

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

                if distance <= radius + 20:
                    matched_building = {
                        'id': building.id,
                        'name': building.name,
                        'slug': building.slug,
                        'status': building.status,
                        'is_active': building.is_active,
                    }
                    
                    if accuracy > 50:
                        status = 'weak_signal'
                    elif distance <= radius:
                        status = 'inside'
                    else:
                        status = 'nearby'

        result = {
            'status': status,
            'distance_meters': round(min_distance, 2) if min_distance != float('inf') else None,
            'building': matched_building,
        }

        return success_response(result)
