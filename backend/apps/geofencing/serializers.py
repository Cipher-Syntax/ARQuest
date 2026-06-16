from rest_framework import serializers

class LocationValidationSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    accuracy_meters = serializers.FloatField(min_value=0)

    def validate(self, data):
        if data['latitude'] == 0 and data['longitude'] == 0:
            raise serializers.ValidationError("Invalid coordinates")
        return data
