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
