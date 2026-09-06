import uuid
import math
from django.db import models


class NavigationNode(models.Model):
    """A fixed GPS waypoint on the WMSU campus (entrance, junction, gate, POI)."""

    NODE_TYPE_CHOICES = [
        ('entrance', 'Building Entrance'),
        ('junction', 'Walkway'),
        ('gate', 'Campus Gate'),
        ('poi', 'Point of Interest'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    label = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    node_type = models.CharField(
        max_length=50,
        choices=NODE_TYPE_CHOICES,
        default='junction',
    )
    building = models.ForeignKey(
        'buildings.Building',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='navigation_nodes',
        help_text='Link this node to a building if it is an entrance node.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['label']

    def __str__(self):
        return f'{self.label} ({self.node_type})'


class NavigationPath(models.Model):
    """A walkable path segment connecting two NavigationNodes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    start_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='paths_from',
    )
    end_node = models.ForeignKey(
        NavigationNode,
        on_delete=models.CASCADE,
        related_name='paths_to',
    )
    geometry = models.JSONField(
        help_text='List of [lng, lat] coordinate pairs forming the real walkway shape.',
    )
    distance_meters = models.FloatField(
        default=0.0,
        help_text='Total length of this path segment in meters (auto-calculated on save).',
    )
    is_accessible = models.BooleanField(
        default=True,
        help_text='Wheelchair/accessibility compatible.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.start_node.label} → {self.end_node.label}'

    def save(self, *args, **kwargs):
        """Auto-calculate distance from geometry on every save."""
        if self.geometry and len(self.geometry) >= 2:
            self.distance_meters = self._calculate_distance(self.geometry)
        super().save(*args, **kwargs)

    @staticmethod
    def _calculate_distance(coords):
        """Haversine formula across all coordinate pairs in the geometry."""
        total = 0.0
        R = 6371000  # Earth radius in metres
        for i in range(len(coords) - 1):
            lng1, lat1 = coords[i]
            lng2, lat2 = coords[i + 1]
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlng = math.radians(lng2 - lng1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
            total += R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(total, 2)
