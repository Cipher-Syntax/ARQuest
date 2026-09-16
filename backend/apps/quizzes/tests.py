from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.buildings.models import Building
from .models import QuizQuestion


class QuizQuestionAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@wmsu.edu.ph',
            password='password123',
            role=User.Role.ADMIN
        )
        self.student = User.objects.create_user(
            username='student_user',
            email='student@wmsu.edu.ph',
            password='password123',
            role=User.Role.STUDENT
        )
        self.building = Building.objects.create(
            name='College of Computing Studies',
            slug='ccs',
            latitude=6.9130,
            longitude=122.0610,
            is_active=True
        )

    def test_admin_create_quiz_question_success(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'building': str(self.building.id),
            'question': 'What does CCS stands for?',
            'option_a': 'College of Computing Science',
            'option_b': 'College of Computing Studies',
            'option_c': 'College of Computing Studios',
            'option_d': 'College of Computing Standards',
            'correct_option': 'B',
            'exp_reward': 50
        }
        res = self.client.post('/api/buildings/quiz-questions/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertEqual(data['building'], str(self.building.id))
        self.assertEqual(data['building_name'], 'College of Computing Studies')
        self.assertEqual(data['question'], 'What does CCS stands for?')
        self.assertEqual(data['correct_option'], 'B')
        self.assertEqual(data['exp_reward'], 50)

        # Confirm saved in database with valid foreign key
        question = QuizQuestion.objects.get(id=data['id'])
        self.assertEqual(question.building, self.building)
        self.assertEqual(question.question, 'What does CCS stands for?')

    def test_create_quiz_question_missing_building_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'question': 'What does CCS stands for?',
            'option_a': 'A',
            'option_b': 'B',
            'option_c': 'C',
            'option_d': 'D',
            'correct_option': 'B',
            'exp_reward': 50
        }
        res = self.client.post('/api/buildings/quiz-questions/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        res_data = res.json()
        self.assertFalse(res_data.get('success'))
        details = res_data.get('error', {}).get('details', {})
        self.assertIn('building', details)

    def test_get_quiz_questions_list_includes_building_metadata(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='Sample Question?',
            option_a='1',
            option_b='2',
            option_c='3',
            option_d='4',
            correct_option='A',
            exp_reward=10
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/buildings/quiz-questions/?building_id={self.building.id}')
        self.assertEqual(res.status_code, 200)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        items = res_data.get('data')
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['building'], str(self.building.id))
        self.assertEqual(items[0]['building_name'], 'College of Computing Studies')

    def test_update_quiz_question_patch_and_put(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='Original Question?',
            option_a='1',
            option_b='2',
            option_c='3',
            option_d='4',
            correct_option='A',
            exp_reward=10
        )
        self.client.force_authenticate(user=self.admin)

        # Test PATCH
        patch_res = self.client.patch(
            f'/api/buildings/quiz-questions/{question.id}/',
            {'question': 'Updated Question via Patch?'},
            format='json'
        )
        self.assertEqual(patch_res.status_code, 200)
        question.refresh_from_db()
        self.assertEqual(question.question, 'Updated Question via Patch?')

        # Test PUT
        put_res = self.client.put(
            f'/api/buildings/quiz-questions/{question.id}/',
            {
                'building': str(self.building.id),
                'question': 'Updated Question via Put?',
                'option_a': 'A',
                'option_b': 'B',
                'option_c': 'C',
                'option_d': 'D',
                'correct_option': 'C',
                'exp_reward': 25
            },
            format='json'
        )
        self.assertEqual(put_res.status_code, 200)
        question.refresh_from_db()
        self.assertEqual(question.question, 'Updated Question via Put?')
        self.assertEqual(question.correct_option, 'C')

    def test_delete_quiz_question(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='Question to delete?',
            option_a='1',
            option_b='2',
            option_c='3',
            option_d='4',
            correct_option='A',
            exp_reward=10
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/buildings/quiz-questions/{question.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(QuizQuestion.objects.filter(id=question.id).exists())

    def test_non_admin_cannot_create_or_delete_quiz(self):
        self.client.force_authenticate(user=self.student)
        payload = {
            'building': str(self.building.id),
            'question': 'Student trying to add question?',
            'option_a': '1',
            'option_b': '2',
            'option_c': '3',
            'option_d': '4',
            'correct_option': 'A',
            'exp_reward': 10
        }
        res = self.client.post('/api/buildings/quiz-questions/', payload, format='json')
        self.assertEqual(res.status_code, 403)

    def test_submit_quiz_answer_correct_awards_exp_and_gain_exp(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='What is 2+2?',
            option_a='3',
            option_b='4',
            option_c='5',
            option_d='6',
            correct_option='B',
            exp_reward=50
        )
        self.client.force_authenticate(user=self.student)
        initial_exp = self.student.exploration_points
        payload = {
            'question_id': str(question.id),
            'selected_option': 'B'
        }
        res = self.client.post('/api/buildings/quiz/answer/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertTrue(data['is_correct'])
        self.assertEqual(data['correct_option'], 'B')
        self.assertEqual(data['exp_awarded'], 50)

        self.student.refresh_from_db()
        self.assertEqual(self.student.exploration_points, initial_exp + 50)

    def test_submit_quiz_answer_incorrect_awards_zero_exp(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='What is 2+2?',
            option_a='3',
            option_b='4',
            option_c='5',
            option_d='6',
            correct_option='B',
            exp_reward=50
        )
        self.client.force_authenticate(user=self.student)
        initial_exp = self.student.exploration_points
        payload = {
            'question_id': str(question.id),
            'selected_option': 'A'
        }
        res = self.client.post('/api/buildings/quiz/answer/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertFalse(data['is_correct'])
        self.assertEqual(data['correct_option'], 'B')
        self.assertEqual(data['exp_awarded'], 0)

        self.student.refresh_from_db()
        self.assertEqual(self.student.exploration_points, initial_exp)

    def test_submit_quiz_answer_already_correct_returns_error(self):
        question = QuizQuestion.objects.create(
            building=self.building,
            question='What is 2+2?',
            option_a='3',
            option_b='4',
            option_c='5',
            option_d='6',
            correct_option='B',
            exp_reward=50
        )
        self.client.force_authenticate(user=self.student)
        payload = {
            'question_id': str(question.id),
            'selected_option': 'B'
        }
        # First submission
        res1 = self.client.post('/api/buildings/quiz/answer/', payload, format='json')
        self.assertEqual(res1.status_code, 200)

        # Second submission
        res2 = self.client.post('/api/buildings/quiz/answer/', payload, format='json')
        self.assertEqual(res2.status_code, 400)
        self.assertFalse(res2.json().get('success'))

