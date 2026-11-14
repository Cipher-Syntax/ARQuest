from rest_framework import serializers
from .models import Building, Geofence, BuildingUnlock, BuildingAsset, Department
from .utils import optimize_glb
from apps.gamification.models import Quest
from apps.quizzes.models import TriviaFact
import json


class FlexibleDateField(serializers.DateField):
    """DateField that accepts an empty string as "no value".

    The admin editor submits multipart FormData, and clearing a date sends an
    empty string rather than omitting the key.
    """

    def to_internal_value(self, value):
        if value in ('', None):
            return None
        return super().to_internal_value(value)


class JSONListField(serializers.Field):
    """Accept either a list or a JSON-encoded list (multipart FormData)."""

    def to_internal_value(self, data):
        if data in ('', None):
            return []
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except ValueError:
                raise serializers.ValidationError('Invalid JSON list.')
        if not isinstance(data, list):
            raise serializers.ValidationError('Expected a list.')
        return data

    def to_representation(self, value):
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    building_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'color_hex', 'is_active', 'building_count']

    def get_building_count(self, obj):
        return obj.buildings.count()


class DepartmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['name', 'code', 'description', 'color_hex', 'is_active']

    def validate_code(self, value):
        import re
        if not re.match(r'^[-a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError('Code must be slug-safe (letters, numbers, hyphens, underscores only).')
        return value



class GeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['id', 'latitude', 'longitude', 'radius_meters', 'is_active', 'created_at', 'updated_at']


class GeofenceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Geofence
        fields = ['latitude', 'longitude', 'radius_meters', 'is_active']
    
    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return value
    
    def validate_radius_meters(self, value):
        if value <= 0:
            raise serializers.ValidationError('Radius must be greater than 0')
        return value


class BuildingSerializer(serializers.ModelSerializer):
    geofences = GeofenceSerializer(many=True, read_only=True)
    model_url = serializers.SerializerMethodField()
    has_model = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    qr_code_secret = serializers.SerializerMethodField()
    departments = DepartmentSerializer(many=True, read_only=True)
    primary_department = DepartmentSerializer(read_only=True)
    accreditation = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_active', 'geofences',
                  'model_url', 'has_model', 'model_version', 'model_file_size', 'model_active', 'image_url', 'hotspots',
                  'qr_code_secret', 'departments', 'primary_department', 'accreditation',
                  'created_at', 'updated_at', 'deleted_at']

    def get_has_model(self, obj):
        """Whether a 3D model exists, independent of whether this user may load it."""
        return bool(obj.model_file)

    def _accreditation_enabled(self):
        """Memoized per serializer instance so a list request hits settings once."""
        if not hasattr(self, '_accreditation_flag'):
            from apps.api.models import SystemSetting
            self._accreditation_flag = SystemSetting.get_settings().enable_accreditation
        return self._accreditation_flag

    def _can_view_accreditation(self):
        """Admins always see the record (they author it). Professionals only
        while the admin switch is on. Students and visitors never see it."""
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is None or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_admin_role', False):
            return True
        if getattr(user, 'is_professional_role', False):
            return self._accreditation_enabled()
        return False

    def _score_checklist(self, checklist):
        weights = {'COMPLIANT': 1.0, 'PARTIAL': 0.5, 'NON_COMPLIANT': 0.0}
        values = [
            weights[item.get('status')]
            for item in checklist
            if item.get('status') in weights
        ]
        if not values:
            return None
        return int(round((sum(values) / len(values)) * 100))

    def _normalize_checklist(self, checklist):
        allowed = dict(Building.ACCREDITATION_CHECKLIST_STATUS_CHOICES)
        if not isinstance(checklist, list):
            return []
        normalized = []
        for item in checklist:
            if not isinstance(item, dict):
                continue
            label = str(item.get('label') or '').strip()
            if not label:
                continue
            status = item.get('status')
            if status not in allowed:
                status = 'NOT_APPLICABLE'
            normalized.append({
                'label': label,
                'status': status,
                'status_label': allowed[status],
                'remarks': str(item.get('remarks') or '').strip(),
            })
        return normalized

    def get_accreditation(self, obj):
        if not self._can_view_accreditation():
            return None

        checklist = self._normalize_checklist(obj.accreditation_checklist or [])
        programs = obj.accreditation_programs
        if not isinstance(programs, list):
            programs = []

        return {
            'status': obj.accreditation_status,
            'status_label': obj.get_accreditation_status_display(),
            'level': obj.accreditation_level,
            'level_label': obj.get_accreditation_level_display() if obj.accreditation_level else '',
            'accrediting_body': obj.accrediting_body,
            'programs': [str(p) for p in programs if str(p).strip()],
            'valid_until': obj.accreditation_valid_until.isoformat() if obj.accreditation_valid_until else None,
            'reference_no': obj.accreditation_reference_no,
            'evaluated_at': obj.accreditation_evaluated_at.isoformat() if obj.accreditation_evaluated_at else None,
            'evaluator': obj.accreditation_evaluator,
            'findings': obj.accreditation_findings,
            'recommendation': obj.accreditation_recommendation,
            'checklist': checklist,
            'compliance_score': self._score_checklist(checklist),
        }

    def get_model_url(self, obj):
        """Only expose the 3D model file to roles allowed to load it.

        Admins and professionals bypass the unlock requirement; students require a
        BuildingUnlock row; visitors never receive the URL. Panorama access is
        handled by a separate endpoint and is unaffected.
        """
        if not obj.model_file:
            return None
        if not self._can_view_model(obj):
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.model_file.url)
        return obj.model_file.url

    def _can_view_model(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is None or not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_admin_role', False) or getattr(user, 'is_professional_role', False):
            return True
        if getattr(user, 'is_student_role', False):
            return self._is_unlocked_for_user(obj, user)
        return False

    def _is_unlocked_for_user(self, obj, user):
        # Views annotate students with `user_has_unlock` to avoid an N+1 query.
        annotated = getattr(obj, 'user_has_unlock', None)
        if annotated is not None:
            return bool(annotated)
        return BuildingUnlock.effective_for(user).filter(building=obj).exists()

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_qr_code_secret(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user and getattr(user, 'is_admin_role', False):
            return str(obj.qr_code_secret)
        return None


class BuildingWriteSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    slug = serializers.SlugField(required=False, allow_blank=True)
    hotspots = serializers.CharField(required=False, allow_blank=True)
    accreditation_valid_until = FlexibleDateField(required=False, allow_null=True)
    accreditation_evaluated_at = FlexibleDateField(required=False, allow_null=True)
    accreditation_programs = JSONListField(required=False)
    accreditation_checklist = JSONListField(required=False)
    department_ids = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='departments',
        many=True,
        required=False
    )
    primary_department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='primary_department',
        allow_null=True,
        required=False
    )

    class Meta:
        model = Building
        fields = ['name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_active',
                  'model_version', 'model_active', 'model_file', 'image', 'hotspots', 'department_ids', 'primary_department_id',
                  'accreditation_status', 'accreditation_level', 'accrediting_body', 'accreditation_programs',
                  'accreditation_valid_until', 'accreditation_reference_no', 'accreditation_evaluated_at',
                  'accreditation_evaluator', 'accreditation_findings', 'accreditation_recommendation',
                  'accreditation_checklist']
    
    def validate_latitude(self, value):
        if value is not None and (value < -90 or value > 90):
            raise serializers.ValidationError('Latitude must be between -90 and 90')
        return value
    
    def validate_longitude(self, value):
        if value is not None and (value < -180 or value > 180):
            raise serializers.ValidationError('Longitude must be between -180 and 180')
        return value

    def validate_slug(self, value):
        if value:
            qs = Building.all_objects.filter(slug=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('A building with this slug already exists.')
        return value
        
    def validate_hotspots(self, value):
        import json
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                raise serializers.ValidationError('Invalid JSON for hotspots')
        return value

    def validate_accreditation_programs(self, value):
        if len(value) > 50:
            raise serializers.ValidationError('A building can list at most 50 programs.')
        programs = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError('Each program must be a text value.')
            item = item.strip()
            if item:
                programs.append(item)
        return programs

    def validate_accreditation_checklist(self, value):
        if len(value) > 100:
            raise serializers.ValidationError('A checklist can contain at most 100 criteria.')
        allowed = dict(Building.ACCREDITATION_CHECKLIST_STATUS_CHOICES)
        checklist = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError('Each criterion must be an object.')
            label = str(item.get('label') or '').strip()
            if not label:
                continue
            status = item.get('status') or 'NOT_APPLICABLE'
            if status not in allowed:
                raise serializers.ValidationError(f'Unknown checklist status: {status}')
            checklist.append({
                'label': label,
                'status': status,
                'remarks': str(item.get('remarks') or '').strip(),
            })
        return checklist

    def validate_model_file(self, value):
        if value:
            max_size = 500 * 1024 * 1024  # 500 MB
            if value.size > max_size:
                raise serializers.ValidationError(f'The 3D model exceeds the maximum file size limit of 500 MB. Current size is {value.size / (1024*1024):.2f} MB.')
            
            # Automatically compress/decimate the .glb file
            if value.name.lower().endswith('.glb'):
                optimized_file = optimize_glb(value)
                return optimized_file
        return value




class BuildingUnlockSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    building_slug = serializers.CharField(source='building.slug', read_only=True)
    
    class Meta:
        model = BuildingUnlock
        fields = ['id', 'building', 'building_name', 'building_slug', 'source', 'is_demo', 'unlocked_at', 'last_validated_at']
        read_only_fields = ['unlocked_at', 'last_validated_at']


class UnlockedBuildingSerializer(serializers.ModelSerializer):
    is_unlocked = serializers.BooleanField(default=True)
    unlock_source = serializers.CharField(default='role_access')
    unlocked_at = serializers.DateTimeField(required=False, allow_null=True)
    model_url = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Building
        fields = ['id', 'name', 'slug', 'description', 'latitude', 'longitude', 'status', 'is_unlocked', 'unlock_source', 
                  'unlocked_at', 'model_url', 'image_url', 'model_version', 'model_file_size', 'model_active', 'hotspots']
    
    def get_model_url(self, obj):
        if obj.model_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.model_file.url)
            return obj.model_file.url
        return None

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class BuildingAssetSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = BuildingAsset
        fields = ['id', 'building', 'asset_type', 'file_url', 'version', 'file_size', 'checksum', 'is_active', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
