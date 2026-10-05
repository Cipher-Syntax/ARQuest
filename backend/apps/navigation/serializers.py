from rest_framework import serializers
from .models import NavigationNode, NavigationPath, CampusPerimeter


class NavigationNodeSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True, default=None)

    class Meta:
        model = NavigationNode
        fields = [
            'id', 'label', 'latitude', 'longitude',
            'node_type', 'building', 'building_name',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_latitude(self, value):
        if not -90 <= value <= 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90.')
        return value

    def validate_longitude(self, value):
        if not -180 <= value <= 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180.')
        return value


class NavigationPathSerializer(serializers.ModelSerializer):
    start_node_label = serializers.CharField(source='start_node.label', read_only=True)
    end_node_label = serializers.CharField(source='end_node.label', read_only=True)

    class Meta:
        model = NavigationPath
        fields = [
            'id', 'start_node', 'start_node_label',
            'end_node', 'end_node_label',
            'geometry', 'distance_meters',
            'is_accessible', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'distance_meters', 'created_at']

    def validate_geometry(self, value):
        if not isinstance(value, list) or len(value) < 2:
            raise serializers.ValidationError(
                'Geometry must be a list of at least 2 [lng, lat] coordinate pairs.'
            )
        for coord in value:
            if not isinstance(coord, (list, tuple)) or len(coord) != 2:
                raise serializers.ValidationError(
                    'Each coordinate must be a [lng, lat] pair.'
                )
        return value


class CampusPerimeterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusPerimeter
        fields = [
            'id', 'name', 'coordinates', 'fill_color', 'fill_opacity',
            'stroke_color', 'stroke_width', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_coordinates(self, value):
        if not isinstance(value, list) or len(value) < 4:
            raise serializers.ValidationError(
                'Coordinates must be a list of at least 4 [lng, lat] coordinate pairs forming a closed polygon.'
            )
        for coord in value:
            if not isinstance(coord, (list, tuple)) or len(coord) != 2:
                raise serializers.ValidationError(
                    'Each coordinate must be a [lng, lat] pair.'
                )
            try:
                lng = float(coord[0])
                lat = float(coord[1])
            except (ValueError, TypeError):
                raise serializers.ValidationError('Coordinate values must be valid numbers.')

            if not -180 <= lng <= 180 or not -90 <= lat <= 90:
                raise serializers.ValidationError('Coordinates must have valid lng (-180..180) and lat (-90..90).')

        # Ensure polygon is closed (first coord == last coord)
        if value[0] != value[-1]:
            value.append(value[0])
        return value

