from rest_framework import serializers
from .models import PanoramaScene, PanoramaHotspot


class PanoramaHotspotSerializer(serializers.ModelSerializer):
    target_scene_id = serializers.IntegerField(source='target_scene.id', read_only=True)
    target_scene_title = serializers.CharField(source='target_scene.title', read_only=True)
    
    class Meta:
        model = PanoramaHotspot
        fields = ['id', 'target_scene_id', 'target_scene_title', 'label', 'yaw', 'pitch']


class PanoramaSceneSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    hotspots = PanoramaHotspotSerializer(many=True, read_only=True)
    
    class Meta:
        model = PanoramaScene
        fields = ['id', 'title', 'image_url', 'is_start_scene', 'sort_order', 'hotspots']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class PanoramaWalkthroughSerializer(serializers.Serializer):
    building_id = serializers.IntegerField()
    building_name = serializers.CharField()
    start_scene = PanoramaSceneSerializer()
    scenes = PanoramaSceneSerializer(many=True)

class PanoramaSceneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanoramaScene
        fields = ['title', 'image', 'is_start_scene', 'sort_order', 'is_active']


class PanoramaHotspotWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanoramaHotspot
        fields = ['target_scene', 'label', 'yaw', 'pitch', 'is_active']
        
    def validate(self, data):
        source_scene = self.context.get('source_scene') or (self.instance.source_scene if self.instance else None)
        target_scene = data.get('target_scene')
        
        if source_scene and target_scene:
            if source_scene.building != target_scene.building:
                raise serializers.ValidationError({'target_scene': 'Hotspot cannot link to different building'})
        
        return data