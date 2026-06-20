from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.buildings.models import Building, Geofence
from .utils import calculate_distance

class GeofencingUtilsTestCase(TestCase):
    def test_calculate_distance(self):
        lat1, lon1 = 14.5995, 120.9842
        lat2, lon2 = 14.6000, 120.9850
        
        distance = calculate_distance(lat1, lon1, lat2, lon2)
        self.assertIsInstance(distance, float)
        self.assertGreater(distance, 0)
        self.assertLess(distance, 200)

class ValidateLocationViewTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            role='student'
        )
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.5995,
            longitude=120.9842,
            is_active=True,
            status='VISIBLE'
        )
        self.geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.5995,
            longitude=120.9842,
            radius_meters=50,
            is_active=True
        )
        self.url = reverse('validate-location')

    def test_anonymous_request_rejected(self):
        response = self.client.post(self.url, {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 401)

    def test_location_inside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['status'], 'inside')
        self.assertIsNotNone(response.data['data']['building'])
        self.assertEqual(response.data['data']['building']['id'], self.building.id)

    def test_location_outside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 14.6100,
            'longitude': 121.0000,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['status'], 'outside')
        self.assertIsNone(response.data['data']['building'])

    def test_weak_signal_detection(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 60
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['status'], 'weak_signal')

    def test_invalid_coordinates(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 100,
            'longitude': 200,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_inactive_geofence_ignored(self):
        self.geofence.is_active = False
        self.geofence.save()
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['status'], 'outside')
        self.assertIsNone(response.data['data']['building'])

    def test_nearby_status(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            'latitude': 14.5996,
            'longitude': 120.9847,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertIn(response.data['data']['status'], ['inside', 'nearby'])

