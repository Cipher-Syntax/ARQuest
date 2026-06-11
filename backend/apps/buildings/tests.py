from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from .models import Building, Geofence


class BuildingModelTestCase(TestCase):
    def test_building_accepts_valid_coordinates(self):
        building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.123456,
            longitude=121.654321
        )
        
        self.assertIsNotNone(building.id)
        self.assertEqual(building.latitude, 14.123456)
        self.assertEqual(building.longitude, 121.654321)
    
    def test_building_slug_must_be_unique(self):
        Building.objects.create(
            name='Building 1',
            slug='test-slug',
            latitude=14.0,
            longitude=121.0
        )
        
        with self.assertRaises(Exception):
            Building.objects.create(
                name='Building 2',
                slug='test-slug',
                latitude=14.0,
                longitude=121.0
            )


class GeofenceModelTestCase(TestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.123456,
            longitude=121.654321
        )
    
    def test_geofence_accepts_valid_radius(self):
        geofence = Geofence.objects.create(
            building=self.building,
            center_latitude=14.123456,
            center_longitude=121.654321,
            radius_meters=50
        )
        
        self.assertIsNotNone(geofence.id)
        self.assertEqual(geofence.radius_meters, 50)
    
    def test_geofence_rejects_zero_radius(self):
        geofence = Geofence(
            building=self.building,
            center_latitude=14.123456,
            center_longitude=121.654321,
            radius_meters=0
        )
        
        with self.assertRaises(ValidationError):
            geofence.full_clean()
    
    def test_geofence_rejects_negative_radius(self):
        with self.assertRaises(Exception):
            Geofence.objects.create(
                building=self.building,
                center_latitude=14.123456,
                center_longitude=121.654321,
                radius_meters=-10
            )


class BuildingAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student'
        )
        self.building1 = Building.objects.create(
            name='Active Building',
            slug='active-building',
            latitude=14.123456,
            longitude=121.654321,
            is_active=True
        )
        self.building2 = Building.objects.create(
            name='Inactive Building',
            slug='inactive-building',
            latitude=14.654321,
            longitude=121.123456,
            is_active=False
        )
    
    def test_building_list_requires_authentication(self):
        response = self.client.get('/api/buildings/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_building_list_returns_only_active_buildings(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/buildings/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'Active Building')
    
    def test_building_detail_requires_authentication(self):
        response = self.client.get(f'/api/buildings/{self.building1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_building_detail_returns_active_building(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/buildings/{self.building1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'Active Building')
    
    def test_building_detail_returns_404_for_inactive_building(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/buildings/{self.building2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'Building not found')
    
    def test_building_detail_returns_404_for_nonexistent_building(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/buildings/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['success'])
