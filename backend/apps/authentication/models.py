from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models, transaction
from django.utils import timezone
from datetime import timedelta, date
import random


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Force role to admin for superusers so they can login to React Web Admin
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(username, email, password, **extra_fields)


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
    
    objects = CustomUserManager()
    
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
    
    @transaction.atomic
    def update_streak(self):
        """
        Call on every successful login.
        Returns the bonus EXP awarded (5 normally, 10 on every 3rd consecutive day).
        """
        fresh_self = type(self).objects.select_for_update().get(pk=self.pk)
        
        today = date.today()
        bonus_exp = 0

        if fresh_self.last_login_date is None:
            fresh_self.streak_count = 1
            bonus_exp = 5
        elif fresh_self.last_login_date == today:
            return 0
        elif fresh_self.last_login_date == today - timedelta(days=1):
            fresh_self.streak_count += 1
            if fresh_self.streak_count > 0 and fresh_self.streak_count % 3 == 0:
                bonus_exp = 10
            else:
                bonus_exp = 5
        else:
            fresh_self.streak_count = 1
            bonus_exp = 5

        fresh_self.last_login_date = today
        if bonus_exp > 0:
            fresh_self.exploration_points += bonus_exp
            
        fresh_self.save(update_fields=['streak_count', 'last_login_date', 'exploration_points'])

        self.streak_count = fresh_self.streak_count
        self.last_login_date = fresh_self.last_login_date
        self.exploration_points = fresh_self.exploration_points

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
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_otp():
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
    
    def __str__(self):
        return f"OTP for {self.email}"

class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    push_token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Device for {self.user.username}"
