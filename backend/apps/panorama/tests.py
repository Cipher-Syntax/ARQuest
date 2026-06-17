from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.buildings.models import Building
from apps.panorama.models import PanoramaScene, PanoramaHotspot

User = get_user_model()


class PanoramaAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            role='student'
        )
        
        self.professional = User.objects.create_user(
            username='professional',
            email='prof@test.com',
            password='testpass123',
            role='professional'
        )
        
        # Create test building
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=0.0,
            longitude=0.0,
            is_active=True
        )
        
        # Create panorama scenes
        self.scene1 = PanoramaScene.objects.create(
            building=self.building,
            title='Entrance',
            image='panoramas/test1.jpg',
            is_start_scene=True,
            is_active=True,
            sort_order=1
        )
        
        self.scene2 = PanoramaScene.objects.create(
            building=self.building,
            title='Hallway',
            image='panoramas/test2.jpg',
            is_active=True,
            sort_order=2
        )
        
        self.inactive_scene = PanoramaScene.objects.create(
            building=self.building,
            title='Inactive Room',
            image='panoramas/test3.jpg',
            is_active=False,
            sort_order=3
        )
        
        self.hotspot = PanoramaHotspot.objects.create(
            source_scene=self.scene1,
            target_scene=self.scene2,
            label='Go to Hallway',
            yaw=90.0,
            pitch=0.0,
            is_active=True
        )
        
        # Unlock the building for the student so they can access panoramas
        from apps.buildings.models import BuildingUnlock
        BuildingUnlock.objects.create(
            user=self.student,
            building=self.building,
            source='geofence'
        )
    
    def test_building_panorama_authenticated_required(self):
        """Test that authentication is required"""
        response = self.client.get(f'/api/buildings/{self.building.id}/panorama/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_building_panorama_returns_walkthrough(self):
        """Test walkthrough returns start scene and active scenes"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/panorama/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        data = response.data['data']
        self.assertEqual(data['building_id'], self.building.id)
        self.assertEqual(data['building_name'], self.building.name)
        self.assertIsNotNone(data['start_scene'])
        self.assertEqual(data['start_scene']['title'], 'Entrance')
        self.assertEqual(len(data['scenes']), 2)  # Only active scenes
    
    def test_building_panorama_excludes_inactive_scenes(self):
        """Test that inactive scenes are not returned"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/panorama/')
        
        data = response.data['data']
        scene_titles = [s['title'] for s in data['scenes']]
        self.assertNotIn('Inactive Room', scene_titles)
    
    def test_building_panorama_includes_hotspots(self):
        """Test that scenes include their hotspots"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/panorama/')
        
        start_scene = response.data['data']['start_scene']
        self.assertEqual(len(start_scene['hotspots']), 1)
        self.assertEqual(start_scene['hotspots'][0]['label'], 'Go to Hallway')
        self.assertEqual(start_scene['hotspots'][0]['target_scene_id'], self.scene2.id)
    
    def test_building_panorama_not_found(self):
        """Test 404 for building without panorama"""
        building2 = Building.objects.create(
            name='No Panorama Building',
            slug='no-pano',
            latitude=0.0,
            longitude=0.0
        )
        
        # Unlock it so we get past the 403 check to test the 404 panorama check
        from apps.buildings.models import BuildingUnlock
        BuildingUnlock.objects.create(user=self.student, building=building2, source='geofence')
        
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{building2.id}/panorama/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_panorama_scene_detail(self):
        """Test fetching individual scene details"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/panorama/scenes/{self.scene1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertEqual(data['title'], 'Entrance')
        self.assertEqual(len(data['hotspots']), 1)
    
    def test_panorama_scene_inactive_not_found(self):
        """Test inactive scenes are not accessible"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/panorama/scenes/{self.inactive_scene.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_hotspot_cannot_link_different_building(self):
        """Test that hotspots cannot link to different buildings"""
        building2 = Building.objects.create(
            name='Another Building',
            slug='another',
            latitude=0.0,
            longitude=0.0
        )
        
        scene_other = PanoramaScene.objects.create(
            building=building2,
            title='Other Building Scene',
            image='panoramas/other.jpg',
            is_active=True
        )
        
        from django.core.exceptions import ValidationError
        hotspot = PanoramaHotspot(
            source_scene=self.scene1,
            target_scene=scene_other,
            label='Invalid Link',
            yaw=0,
            pitch=0
        )
        
        with self.assertRaises(ValidationError):
            hotspot.full_clean()
