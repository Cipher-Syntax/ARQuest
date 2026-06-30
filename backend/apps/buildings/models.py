import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeleteModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])
        self.cascade_soft_delete()

    def cascade_soft_delete(self):
        pass

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])
        self.cascade_restore()
        
    def cascade_restore(self):
        pass

    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    color_hex = models.CharField(max_length=7, blank=True, help_text='Hex color for map pins, e.g. #7F0303')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Building(SoftDeleteModel):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('HIDDEN', 'Published (Hidden)'),
        ('VISIBLE', 'Published (Visible)'),
    ]

    departments = models.ManyToManyField(Department, related_name='buildings', blank=True)
    primary_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_buildings', help_text='Determines the map pin color')

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT', help_text='Drafts can be saved without coordinates/slugs.')
    is_active = models.BooleanField(default=True, help_text='If false, shows building as closed/inactive')
    model_file = models.FileField(upload_to='models/', blank=True, null=True)
    model_version = models.CharField(max_length=50, blank=True)
    model_file_size = models.PositiveIntegerField(blank=True, null=True, help_text='File size in bytes')
    model_active = models.BooleanField(default=False)
    hotspots = models.JSONField(default=list, blank=True)
    qr_code_secret = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return self.name
    
    def clean(self):
        if self.status in ['HIDDEN', 'VISIBLE']:
            errors = {}
            if self.latitude is None:
                errors['latitude'] = 'Latitude is required to publish.'
            if self.longitude is None:
                errors['longitude'] = 'Longitude is required to publish.'
            if not self.slug:
                errors['slug'] = 'Slug is required to publish.'
            
            if errors:
                raise ValidationError(errors)

        if self.latitude is not None and (self.latitude < -90 or self.latitude > 90):
            raise ValidationError({'latitude': 'Latitude must be between -90 and 90'})
        if self.longitude is not None and (self.longitude < -180 or self.longitude > 180):
            raise ValidationError({'longitude': 'Longitude must be between -180 and 180'})

    def cascade_soft_delete(self):
        self.quests.all().update(deleted_at=self.deleted_at)
        self.trivia_facts.all().update(deleted_at=self.deleted_at)
        
    def cascade_restore(self):
        self.quests.model.all_objects.filter(target_building=self, deleted_at__isnull=False).update(deleted_at=None)
        self.trivia_facts.model.all_objects.filter(building=self, deleted_at__isnull=False).update(deleted_at=None)


class Geofence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='geofences')
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    radius_meters = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['building', 'is_active']),
        ]
    
    def __str__(self):
        return f"Geofence for {self.building.name}"
    
    def clean(self):
        if self.latitude < -90 or self.latitude > 90:
            raise ValidationError({'latitude': 'Latitude must be between -90 and 90'})
        if self.longitude < -180 or self.longitude > 180:
            raise ValidationError({'longitude': 'Longitude must be between -180 and 180'})
        if self.radius_meters <= 0:
            raise ValidationError({'radius_meters': 'Radius must be greater than 0'})


class BuildingUnlock(models.Model):
    SOURCE_CHOICES = [
        ('geofence', 'Geofence'),
        ('admin', 'Admin'),
        ('role_access', 'Role Access'),
        ('qr', 'QR Scan'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='building_unlocks')
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='unlocks')
    unlocked_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='geofence')
    last_validated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-unlocked_at']
        unique_together = [['user', 'building']]
        indexes = [
            models.Index(fields=['user', 'building']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.building.name}"
    
    def clean(self):
        if self.building and not self.building.is_active:
            raise ValidationError({'building': 'Cannot unlock inactive building'})


class BuildingAsset(models.Model):
    ASSET_TYPE_CHOICES = [
        ('model', '3D Model'),
        ('panorama', 'Panorama Image'),
        ('image', 'Building Image'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='assets')
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    file = models.FileField(upload_to='assets/')
    version = models.PositiveIntegerField(default=1)
    file_size = models.PositiveIntegerField(blank=True, null=True, help_text='File size in bytes')
    checksum = models.CharField(max_length=64, blank=True, default='', help_text='SHA256 hash for cache invalidation')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['building', 'asset_type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.building.name} - {self.get_asset_type_display()}"


class Quest(SoftDeleteModel):
    title = models.CharField(max_length=255)
    hint = models.TextField()
    target_building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='quests')
    reward_points = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class UserQuestProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quest_progress')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = [['user', 'quest']]

    def __str__(self):
        return f"{self.user.username} - {self.quest.title}"


class TriviaFact(SoftDeleteModel):
	building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='trivia_facts')
	fact = models.TextField()
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self):
		return f"Trivia for {self.building.name}"


class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.CharField(max_length=255)
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])
    exp_reward = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.building.name} - {self.question}"


class Badge(models.Model):
	TRIGGER_CHOICES = [
		('first_unlock', 'First Building Unlocked'),
		('unlocks_5', '5 Buildings Unlocked'),
		('unlocks_10', '10 Buildings Unlocked'),
		('unlocks_all', 'All Buildings Unlocked'),
		('first_quest', 'First Quest Completed'),
		('quests_5', '5 Quests Completed'),
		('quests_10', '10 Quests Completed'),
		('points_100', '100 Points Earned'),
		('points_500', '500 Points Earned'),
		('points_1000', '1000 Points Earned'),
	]

	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	name = models.CharField(max_length=100)
	description = models.TextField()
	icon = models.CharField(max_length=10, help_text='Emoji icon e.g. 🏅')
	color_hex = models.CharField(max_length=7, default='#FFD700')
	trigger = models.CharField(max_length=30, choices=TRIGGER_CHOICES, unique=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']

	def __str__(self):
		return self.name


class UserBadge(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
	badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='user_badges')
	earned_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = [['user', 'badge']]
		ordering = ['-earned_at']

	def __str__(self):
		return f'{self.user.username} - {self.badge.name}'

