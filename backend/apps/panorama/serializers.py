import os
from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import serializers

from .models import PanoramaScene, PanoramaHotspot

# Panoramas can be 2:1 equirectangular spheres (360°x180°) or wide phone camera
# panoramic sweeps (which the Three.js viewer renders via CylinderGeometry).
PANORAMA_MIN_RATIO = 1.3
PANORAMA_MAX_RATIO = 8.0
# Anything wider than this is downscaled on upload so mobile clients are not
# forced to download 8K+ JPEGs over the network.
PANORAMA_MAX_DIMENSION = 8192
PANORAMA_JPEG_QUALITY = 88


class PanoramaHotspotSerializer(serializers.ModelSerializer):
    target_scene_id = serializers.UUIDField(source='target_scene.id', read_only=True)
    target_scene_title = serializers.CharField(source='target_scene.title', read_only=True)
    
    class Meta:
        model = PanoramaHotspot
        fields = ['id', 'target_scene_id', 'target_scene_title', 'label', 'yaw', 'pitch']


class PanoramaSceneSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    hotspots = PanoramaHotspotSerializer(many=True, read_only=True)
    
    class Meta:
        model = PanoramaScene
        fields = [
            'id', 'title', 'image_url', 'is_start_scene', 'sort_order', 'hotspots',
            'anchor_x', 'anchor_y', 'anchor_z', 'anchor_radius',
            'width', 'height', 'file_size', 'created_at',
        ]
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class PanoramaWalkthroughSerializer(serializers.Serializer):
    building_id = serializers.UUIDField()
    building_name = serializers.CharField()
    start_scene = PanoramaSceneSerializer()
    scenes = PanoramaSceneSerializer(many=True)

class PanoramaSceneWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PanoramaScene
        fields = [
            'title', 'image', 'is_start_scene', 'sort_order', 'is_active',
            'anchor_x', 'anchor_y', 'anchor_z', 'anchor_radius',
            'width', 'height', 'file_size',
        ]
        read_only_fields = ['width', 'height', 'file_size']

    def validate_image(self, image):
        """Validate that the upload is a 2:1 equirectangular panorama.

        Oversized uploads (max dimension above 8192px) are downscaled in place
        and re-encoded as JPEG so the stored file stays reasonable for mobile
        streaming. Detected dimensions are attached to the file and copied to
        the model in ``validate``.
        """
        try:
            from PIL import Image
        except ImportError:  # pragma: no cover - Pillow is a hard dependency
            return image

        original_pos = image.tell() if hasattr(image, 'tell') else 0
        try:
            image.seek(0)
            with Image.open(image) as probe:
                probe.verify()
            image.seek(0)
            img = Image.open(image)
            img.load()
        except Exception:
            raise serializers.ValidationError(
                'Upload a valid JPEG or PNG panorama image.'
            )

        width, height = img.size
        if not height:
            raise serializers.ValidationError('Panorama image has no height.')

        ratio = width / height
        if not (PANORAMA_MIN_RATIO <= ratio <= PANORAMA_MAX_RATIO):
            raise serializers.ValidationError(
                f'Panorama photos must be landscape images (between 1.3:1 and 8:1). '
                f'This image is {width}x{height}px ({ratio:.2f}:1). '
                f'Standard 360° photos (2:1) and wide phone camera panoramas are supported.'
            )

        file_size = getattr(image, 'size', None)

        if max(width, height) > PANORAMA_MAX_DIMENSION:
            scale = PANORAMA_MAX_DIMENSION / float(max(width, height))
            new_size = (
                max(2, int(round(width * scale))),
                max(1, int(round(height * scale))),
            )
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            img = img.resize(new_size, Image.LANCZOS)

            buffer = BytesIO()
            img.save(
                buffer,
                format='JPEG',
                quality=PANORAMA_JPEG_QUALITY,
                optimize=True,
                progressive=True,
            )
            size = buffer.tell()
            buffer.seek(0)

            base_name = os.path.splitext(os.path.basename(image.name or 'panorama'))[0]
            image = InMemoryUploadedFile(
                buffer,
                None,
                f'{base_name or "panorama"}.jpg',
                'image/jpeg',
                size,
                None,
            )
            width, height = new_size
            file_size = size

        image.panorama_width = width
        image.panorama_height = height
        image.panorama_file_size = file_size
        return image

    def validate(self, attrs):
        image = attrs.get('image')
        if image is not None and hasattr(image, 'panorama_width'):
            attrs['width'] = image.panorama_width
            attrs['height'] = image.panorama_height
            attrs['file_size'] = image.panorama_file_size
        return attrs


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
