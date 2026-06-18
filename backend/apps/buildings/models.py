from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings


class Building(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_active = models.BooleanField(default=True)
    model_file = models.FileField(upload_to='models/', blank=True, null=True)
    model_version = models.CharField(max_length=50, blank=True)
    model_file_size = models.PositiveIntegerField(blank=True, null=True, help_text='File size in bytes')
    model_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    def clean(self):
        if self.latitude < -90 or self.latitude > 90:
            raise ValidationError({'latitude': 'Latitude must be between -90 and 90'})
        if self.longitude < -180 or self.longitude > 180:
            raise ValidationError({'longitude': 'Longitude must be between -180 and 180'})


class Geofence(models.Model):
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
    ]
    
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


class Quest(models.Model):
    title = models.CharField(max_length=255)
    hint = models.TextField()
    target_building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='quests')
    reward_points = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class UserQuestProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quest_progress')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = [['user', 'quest']]

    def __str__(self):
        return f"{self.user.username} - {self.quest.title}"


class TriviaFact(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='trivia_facts')
    fact = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trivia for {self.building.name}"
