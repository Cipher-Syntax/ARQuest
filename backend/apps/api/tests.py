from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class HealthCheckTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
    
    def test_health_endpoint_returns_standard_envelope(self):
        response = self.client.get('/api/health/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('success', response.data)
        self.assertIn('data', response.data)
        self.assertIn('error', response.data)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['status'], 'healthy')
        self.assertIsNone(response.data['error'])
