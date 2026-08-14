from django.db import models
from django.conf import settings

class UserLocationTracker(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='location_tracker')
    last_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    last_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    last_timestamp = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Location Tracker for {self.user.email}"
