import uuid
from django.db import models
from django.conf import settings
from apps.buildings.models import Building, SoftDeleteModel

class Quest(SoftDeleteModel):
    title = models.CharField(max_length=255)
    hint = models.TextField()
    target_building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='quests')
    reward_points = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="If set, the quest will expire at this time (used for Timed Challenges)")
    DIFFICULTY_CHOICES = [
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard'),
    ]
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='EASY')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'buildings_quest'

    def __str__(self):
        return self.title

class UserQuestProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quest_progress')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'buildings_userquestprogress'
        unique_together = [['user', 'quest']]

    def __str__(self):
        return f"{self.user.username} - {self.quest.title}"

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
        db_table = 'buildings_badge'
        ordering = ['name']

    def __str__(self):
        return self.name

class UserBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='user_badges')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'buildings_userbadge'
        unique_together = [['user', 'badge']]
        ordering = ['-earned_at']

    def __str__(self):
        return f'{self.user.username} - {self.badge.name}'
