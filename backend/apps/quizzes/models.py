import uuid
from django.db import models
from django.conf import settings
from apps.buildings.models import Building, SoftDeleteModel

class TriviaFact(SoftDeleteModel):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='trivia_facts')
    fact = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'buildings_triviafact'
        ordering = ['-created_at']

    def __str__(self):
        return f"Trivia for {self.building.name}"

class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.CharField(max_length=255)
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')])
    exp_reward = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'buildings_quizquestion'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.building.name} - {self.question}"


class UserQuizProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_progress')
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'buildings_userquizprogress'
        unique_together = ('user', 'question')
