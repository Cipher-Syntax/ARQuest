from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        STUDENT = 'student', 'Student'
        PROFESSIONAL = 'professional', 'Professional'
        VISITOR = 'visitor', 'Visitor'
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VISITOR
    )
    email_verified = models.BooleanField(default=False)
    
    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN
    
    @property
    def is_student_role(self):
        return self.role == self.Role.STUDENT
    
    @property
    def is_professional_role(self):
        return self.role == self.Role.PROFESSIONAL
    
    @property
    def is_visitor_role(self):
        return self.role == self.Role.VISITOR
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class EmailOTP(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_otp():
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
    
    def __str__(self):
        return f"OTP for {self.email}"
