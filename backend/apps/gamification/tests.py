from django.test import TestCase
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.buildings.models import Building
from .models import Quest
from .serializers import QuestSerializer


class QuestAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_quest_user',
            email='admin_quest@wmsu.edu.ph',
            password='password123',
            role=User.Role.ADMIN
        )
        self.building = Building.objects.create(
            name='College of Engineering',
            slug='coe',
            latitude=6.9140,
            longitude=122.0620,
            is_active=True
        )

    def test_create_quest_with_lowercase_difficulty_normalizes_to_uppercase(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'title': 'Find the Robotics Lab',
            'hint': 'Search on the second floor of the engineering building',
            'target_building': str(self.building.id),
            'reward_points': 50,
            'difficulty': 'easy',
            'is_active': True
        }
        res = self.client.post('/api/buildings/quests/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertEqual(data['difficulty'], 'EASY')
        self.assertEqual(data['title'], 'Find the Robotics Lab')

        # Verify in database
        quest = Quest.objects.get(id=data['id'])
        self.assertEqual(quest.difficulty, 'EASY')

    def test_create_quest_with_uppercase_difficulty(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'title': 'Find the Dean Office',
            'hint': 'Near the main entrance',
            'target_building': str(self.building.id),
            'reward_points': 75,
            'difficulty': 'MEDIUM',
            'is_active': True
        }
        res = self.client.post('/api/buildings/quests/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        res_data = res.json()
        self.assertTrue(res_data.get('success'))
        data = res_data.get('data')
        self.assertEqual(data['difficulty'], 'MEDIUM')

        quest = Quest.objects.get(id=data['id'])
        self.assertEqual(quest.difficulty, 'MEDIUM')

    def test_update_quest_normalizes_difficulty(self):
        quest = Quest.objects.create(
            title='Old Quest',
            hint='Old Hint',
            target_building=self.building,
            reward_points=30,
            difficulty='EASY'
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.put(
            f'/api/buildings/quests/{quest.id}/',
            {
                'title': 'Updated Quest',
                'hint': 'Updated Hint',
                'target_building': str(self.building.id),
                'reward_points': 100,
                'difficulty': 'hard'
            },
            format='json'
        )
        self.assertEqual(res.status_code, 200)
        quest.refresh_from_db()
        self.assertEqual(quest.difficulty, 'HARD')
