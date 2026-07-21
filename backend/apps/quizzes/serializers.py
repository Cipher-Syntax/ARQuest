from rest_framework import serializers
from .models import QuizQuestion, TriviaFact

class TriviaFactSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)

    class Meta:
        model = TriviaFact
        fields = ['id', 'building', 'building_name', 'fact', 'is_active', 'created_at', 'updated_at']

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'exp_reward']

