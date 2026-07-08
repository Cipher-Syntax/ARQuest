from django.db import models

class SystemSetting(models.Model):
    # General
    app_name = models.CharField(max_length=100, default='ARQuest')
    maintenance_mode = models.BooleanField(default=False)
    contact_email = models.EmailField(default='support@arquest.edu')
    
    # App Features
    enable_gps = models.BooleanField(default=True)
    enable_qr = models.BooleanField(default=True)
    enable_ar_selfie = models.BooleanField(default=True)
    enable_trivia = models.BooleanField(default=True)
    enable_accreditation = models.BooleanField(default=False)
    
    # Gamification
    enable_leaderboard = models.BooleanField(default=True)
    default_quest_reward = models.IntegerField(default=50)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(SystemSetting, self).save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

from django.conf import settings

class Feedback(models.Model):
    TYPE_CHOICES = [
        ('bug', 'Bug Report'),
        ('feature', 'Feature Request'),
        ('other', 'Other Feedback'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedbacks')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='bug')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()} - {self.user.username if self.user else 'Anonymous'}"

import uuid

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('SYSTEM', 'System Alert'),
        ('PROFESSIONAL', 'Professional Management'),
        ('BUILDING', 'Building Management'),
        ('FEEDBACK', 'User Feedback'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='SYSTEM')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {'Read' if self.is_read else 'Unread'}"
