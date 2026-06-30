from django.core.management.base import BaseCommand
from apps.buildings.models import Building, QuizQuestion

class Command(BaseCommand):
    help = 'Seeds initial trivia quiz questions for buildings'

    def handle(self, *args, **kwargs):
        buildings = Building.objects.filter(is_active=True, status='VISIBLE')
        if not buildings.exists():
            self.stdout.write(self.style.WARNING("No visible buildings found. Please create buildings first."))
            return

        quizzes_data = [
            {
                "question": "What is the primary function of this building?",
                "option_a": "Administration",
                "option_b": "Student Lounge",
                "option_c": "Classrooms & Labs",
                "option_d": "Cafeteria",
                "correct_option": "C",
                "exp_reward": 15,
            },
            {
                "question": "Which of these is not typically found here?",
                "option_a": "Professors",
                "option_b": "Swimming Pool",
                "option_c": "Whiteboards",
                "option_d": "Students",
                "correct_option": "B",
                "exp_reward": 10,
            },
            {
                "question": "When was this area of the campus established?",
                "option_a": "1995",
                "option_b": "2001",
                "option_c": "1904",
                "option_d": "2015",
                "correct_option": "C",
                "exp_reward": 20,
            },
        ]
        
        created_count = 0
        for building in buildings:
            # Check if this building already has quizzes
            if QuizQuestion.objects.filter(building=building).exists():
                continue
                
            for q_data in quizzes_data:
                QuizQuestion.objects.create(
                    building=building,
                    **q_data
                )
                created_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} quiz questions!"))
