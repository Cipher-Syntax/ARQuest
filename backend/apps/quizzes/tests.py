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

    def test_get_building_quiz_returns_max_three_questions_and_daily_metadata(self):
        # Author 5 questions for this building
        for i in range(5):
            QuizQuestion.objects.create(
                building=self.building,
                question=f'Question {i+1}?',
                option_a='1', option_b='2', option_c='3', option_d='4',
                correct_option='A', exp_reward=20
            )

        self.client.force_authenticate(user=self.student)
        res = self.client.get(f'/api/buildings/{self.building.id}/quiz/')
        self.assertEqual(res.status_code, 200)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertEqual(data['daily_limit'], 3)
        self.assertEqual(data['daily_completed'], 0)
        self.assertFalse(data['is_locked'])
        self.assertFalse(data['all_completed'])
        # Capped at exactly 3 questions
        self.assertEqual(len(data['questions']), 3)

    def test_daily_quiz_limit_three_questions_per_building(self):
        questions = []
        for i in range(4):
            q = QuizQuestion.objects.create(
                building=self.building,
                question=f'Quiz Q {i+1}?',
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='A', exp_reward=10
            )
            questions.append(q)

        self.client.force_authenticate(user=self.student)

        # Answer 3 questions on the same day
        for i in range(3):
            res = self.client.post('/api/buildings/quiz/answer/', {
                'question_id': str(questions[i].id),
                'selected_option': 'A'
            }, format='json')
            self.assertEqual(res.status_code, 200)
            data = res.json().get('data')
            self.assertEqual(data['daily_completed'], i + 1)
            self.assertEqual(data['daily_limit'], 3)
            self.assertEqual(data['is_locked'], (i == 2))

        # Now GET /quiz/ should show is_locked: True with 0 questions served
        get_res = self.client.get(f'/api/buildings/{self.building.id}/quiz/')
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.json().get('data')
        self.assertTrue(get_data['is_locked'])
        self.assertEqual(get_data['daily_completed'], 3)
        self.assertEqual(len(get_data['questions']), 0)

    def test_fourth_quiz_attempt_same_day_rejected_with_400(self):
        questions = []
        for i in range(4):
            q = QuizQuestion.objects.create(
                building=self.building,
                question=f'Limit Q {i+1}?',
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='B', exp_reward=10
            )
            questions.append(q)

        self.client.force_authenticate(user=self.student)

        # Exhaust 3 questions
        for i in range(3):
            self.client.post('/api/buildings/quiz/answer/', {
                'question_id': str(questions[i].id),
                'selected_option': 'B'
            }, format='json')

        # 4th question must be rejected with 400
        res4 = self.client.post('/api/buildings/quiz/answer/', {
            'question_id': str(questions[3].id),
            'selected_option': 'B'
        }, format='json')
        self.assertEqual(res4.status_code, 400)
        self.assertFalse(res4.json().get('success'))
        self.assertIn('daily limit', res4.json().get('error', {}).get('message', '').lower())

    def test_daily_quiz_limit_is_isolated_per_building(self):
        # Building 2 (College of Engineering)
        building2 = Building.objects.create(
            name='College of Engineering',
            slug='coe',
            latitude=6.9140,
            longitude=122.0620,
            is_active=True
        )

        for i in range(3):
            QuizQuestion.objects.create(
                building=self.building,
                question=f'CCS Q {i+1}?',
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='A', exp_reward=10
            )
            QuizQuestion.objects.create(
                building=building2,
                question=f'COE Q {i+1}?',
                option_a='A', option_b='B', option_c='C', option_d='D',
                correct_option='A', exp_reward=10
            )

        self.client.force_authenticate(user=self.student)

        # Answer 3 questions at CCS to exhaust CCS daily limit
        ccs_questions = QuizQuestion.objects.filter(building=self.building)
        for q in ccs_questions:
            self.client.post('/api/buildings/quiz/answer/', {
                'question_id': str(q.id),
                'selected_option': 'A'
            }, format='json')

        # CCS is locked
        ccs_res = self.client.get(f'/api/buildings/{self.building.id}/quiz/')
        self.assertTrue(ccs_res.json()['data']['is_locked'])

        # COE must NOT be locked — student walked to COE!
        coe_res = self.client.get(f'/api/buildings/{building2.id}/quiz/')
        self.assertEqual(coe_res.status_code, 200)
        coe_data = coe_res.json()['data']
        self.assertFalse(coe_data['is_locked'])
        self.assertEqual(coe_data['daily_completed'], 0)
        self.assertEqual(len(coe_data['questions']), 3)


