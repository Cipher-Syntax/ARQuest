from django.contrib import admin
from .models import QuizQuestion

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('question', 'building', 'correct_option', 'exp_reward', 'is_active')
    list_filter = ('is_active', 'building')
    search_fields = ('question', 'building__name')
