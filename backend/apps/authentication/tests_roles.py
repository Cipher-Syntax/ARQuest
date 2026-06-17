from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from apps.buildings.models import Building, Geofence, BuildingUnlock, BuildingAsset
from apps.panorama.models import PanoramaScene

class RoleFeatureControlTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.admin = User.objects.create_user(username='admin', email='admin@test.com', password='password123', role='admin')
        self.student = User.objects.create_user(username='student', email='student@test.com', password='password123', role='student')
        self.professional = User.objects.create_user(username='prof', email='prof@test.com', password='password123', role='professional')
        self.visitor = User.objects.create_user(username='visitor', email='visitor@test.com', password='password123', role='visitor')
        
        # Create building
        self.building = Building.objects.create(
            name='Test Building', 
            slug='test-building',
            description='Test Desc', 
            latitude=10.0, 
            longitude=20.0, 
            is_active=True
        )
        self.geofence = Geofence.objects.create(building=self.building, latitude=10.0, longitude=20.0, radius_meters=50.0, is_active=True)
        self.asset = BuildingAsset.objects.create(building=self.building, version=1, file='test.glb', asset_type='model', is_active=True)
        self.scene = PanoramaScene.objects.create(building=self.building, title='Scene 1', image='test.jpg', is_active=True)

    def test_admin_mutation_access(self):
        # Admin can create
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/buildings/', {'name': 'New B', 'slug': 'new-b', 'description': 'desc', 'latitude': 10.0, 'longitude': 20.0})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Student cannot
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/buildings/', {'name': 'New B2', 'slug': 'new-b2', 'description': 'desc', 'latitude': 10.0, 'longitude': 20.0})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_unlock_requirement_for_assets(self):
        self.client.force_authenticate(user=self.student)
        
        # Access assets (locked)
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Unlock building
        BuildingUnlock.objects.create(user=self.student, building=self.building, source='geofence')
        
        # Access assets (unlocked)
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_unlock_requirement_for_panoramas(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/panorama/buildings/{self.building.id}/walkthrough/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        BuildingUnlock.objects.create(user=self.student, building=self.building, source='geofence')
        response = self.client.get(f'/api/panorama/buildings/{self.building.id}/walkthrough/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_professional_access(self):
        # Professional skips unlock check
        self.client.force_authenticate(user=self.professional)
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.get(f'/api/panorama/buildings/{self.building.id}/walkthrough/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_visitor_restrictions(self):
        self.client.force_authenticate(user=self.visitor)
        
        # Cannot unlock
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 10.0, 'longitude': 20.0, 'accuracy_meters': 10.0
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Cannot access assets
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Cannot access panoramas
        response = self.client.get(f'/api/panorama/buildings/{self.building.id}/walkthrough/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_rejection(self):
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
