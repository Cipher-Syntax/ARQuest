from django.db import models
from django.core.exceptions import ValidationError
from apps.buildings.models import Building


class PanoramaScene(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='panorama_scenes')
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='panoramas/')
    sort_order = models.PositiveIntegerField(default=0)
    is_start_scene = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['sort_order', 'created_at']
        indexes = [
            models.Index(fields=['building', 'is_active']),
            models.Index(fields=['is_start_scene']),
        ]
    
    def __str__(self):
        return f"{self.building.name} - {self.title}"
    
    def clean(self):
        if self.is_start_scene:
            existing_start = PanoramaScene.objects.filter(
                building=self.building,
                is_start_scene=True,
                is_active=True
            ).exclude(pk=self.pk)
            if existing_start.exists():
                raise ValidationError({'is_start_scene': 'Building already has a start scene'})


class PanoramaHotspot(models.Model):
    source_scene = models.ForeignKey(PanoramaScene, on_delete=models.CASCADE, related_name='hotspots')
    target_scene = models.ForeignKey(PanoramaScene, on_delete=models.CASCADE, related_name='incoming_hotspots')
    label = models.CharField(max_length=100)
    yaw = models.FloatField(help_text='Horizontal rotation in degrees')
    pitch = models.FloatField(help_text='Vertical rotation in degrees')
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['source_scene', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.source_scene.title} → {self.target_scene.title}"
    
    def clean(self):
        if self.source_scene and self.target_scene:
            if self.source_scene.building != self.target_scene.building:
                raise ValidationError({'target_scene': 'Hotspot cannot link to different building'})
