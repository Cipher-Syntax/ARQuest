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


# ── Custom GPS unlock ranges (dashboard timeframe toggle) ─────────────────────

from datetime import timedelta

from django.utils import timezone

from apps.authentication.models import User
from apps.buildings.models import Building, BuildingUnlock


class DashboardGpsUnlocksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='dash-admin',
            email='dash-admin@test.com',
            password='password123',
            role='admin',
        )
        self.student = User.objects.create_user(
            username='dash-student',
            email='dash-student@test.com',
            password='password123',
            role='student',
        )
        self.url = '/api/dashboard/gps-unlocks/'
        self.today = timezone.localdate()

    def _unlock(self, days_ago, source='geofence', building_index=0):
        building, _ = Building.objects.get_or_create(
            slug=f'dash-building-{building_index}',
            defaults={
                'name': f'Dash Building {building_index}',
                'latitude': 6.9125,
                'longitude': 122.0594,
            },
        )
        unlock = BuildingUnlock.objects.create(
            user=self.student,
            building=building,
            source=source,
        )
        moment = timezone.now() - timedelta(days=days_ago)
        BuildingUnlock.objects.filter(pk=unlock.pk).update(unlocked_at=moment)
        return unlock

    def test_admin_receives_zero_filled_daily_series(self):
        self.client.force_authenticate(user=self.admin)
        self._unlock(0, building_index=0)
        self._unlock(0, building_index=1)
        self._unlock(2, building_index=2)

        start = (self.today - timedelta(days=6)).isoformat()
        end = self.today.isoformat()
        response = self.client.get(
            self.url, {'start_date': start, 'end_date': end}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['granularity'], 'daily')
        self.assertEqual(len(data['series']), 7)
        self.assertEqual(data['total'], 3)
        self.assertEqual(data['series'][-1]['value'], 2)
        self.assertEqual(data['series'][-3]['value'], 1)
        self.assertEqual(data['series'][0]['value'], 0)

    def test_qr_and_role_access_unlocks_are_excluded(self):
        self.client.force_authenticate(user=self.admin)
        self._unlock(1, source='qr', building_index=0)
        self._unlock(1, source='role_access', building_index=1)

        start = (self.today - timedelta(days=6)).isoformat()
        end = self.today.isoformat()
        response = self.client.get(
            self.url, {'start_date': start, 'end_date': end}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['total'], 0)

    def test_granularity_scales_with_range_length(self):
        self.client.force_authenticate(user=self.admin)

        weekly = self.client.get(
            self.url,
            {
                'start_date': (self.today - timedelta(days=59)).isoformat(),
                'end_date': self.today.isoformat(),
            },
        )
        monthly = self.client.get(
            self.url,
            {
                'start_date': (self.today - timedelta(days=399)).isoformat(),
                'end_date': self.today.isoformat(),
            },
        )

        self.assertEqual(weekly.data['data']['granularity'], 'weekly')
        self.assertEqual(monthly.data['data']['granularity'], 'monthly')
        # Bucket alignment to Monday/month start can add one edge bucket.
        self.assertIn(len(weekly.data['data']['series']), (9, 10))
        self.assertIn(len(monthly.data['data']['series']), (13, 14))

    def test_non_admin_is_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(
            self.url,
            {
                'start_date': self.today.isoformat(),
                'end_date': self.today.isoformat(),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_and_invalid_ranges_are_rejected(self):
        self.client.force_authenticate(user=self.admin)

        missing = self.client.get(self.url)
        invalid = self.client.get(
            self.url, {'start_date': 'not-a-date', 'end_date': '2026-01-01'}
        )
        reversed_range = self.client.get(
            self.url, {'start_date': '2026-02-01', 'end_date': '2026-01-01'}
        )

        for response in (missing, invalid, reversed_range):
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(response.data['success'])
