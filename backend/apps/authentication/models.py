from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta, date
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
    exploration_points = models.IntegerField(default=0, help_text="Points earned from discovering AR targets and completing quests")
    avatar_id = models.CharField(max_length=50, blank=True, null=True)
    streak_count = models.IntegerField(default=0, help_text="Consecutive daily login streak")
    last_login_date = models.DateField(null=True, blank=True, help_text="Date of the user's last recorded login for streak tracking")
    
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
    
    def update_streak(self):
        """
        Call on every successful login.
        Returns the bonus EXP awarded (10 per streak day, 0 on same-day repeat).
        """
        today = date.today()
        bonus_exp = 0

        if self.last_login_date is None:
            # First ever login — start streak at 1
            self.streak_count = 1
            bonus_exp = 10
        elif self.last_login_date == today:
            # Already logged in today — no change
            pass
        elif self.last_login_date == today - timedelta(days=1):
            # Consecutive day — extend streak
            self.streak_count += 1
            bonus_exp = 10
        else:
            # Missed one or more days — reset
            self.streak_count = 1
            bonus_exp = 10

        if self.last_login_date != today:
            self.last_login_date = today
            if bonus_exp > 0:
                self.exploration_points += bonus_exp
            self.save(update_fields=['streak_count', 'last_login_date', 'exploration_points'])

        return bonus_exp

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
