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

from .models import SystemSetting

class PublicSettingsAPITests(TestCase):
    def test_public_settings_endpoint(self):
        settings = SystemSetting.get_settings()
        settings.enable_ar_selfie = False
        settings.save()
        
        response = self.client.get('/api/settings/public/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['data']['enable_ar_selfie'])
        self.assertTrue(response.data['data']['enable_gps'])
        self.assertNotIn('contact_email', response.data['data']) # Private info should be hidden
