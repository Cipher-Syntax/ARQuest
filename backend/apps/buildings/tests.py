from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from apps.authentication.models import User
from .models import Building, Geofence, BuildingUnlock


class BuildingModelTest(TestCase):
    def test_building_creation(self):
        building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            description='Test description',
            latitude=14.599512,
            longitude=120.984222,
            is_active=True
        )
        self.assertEqual(building.name, 'Test Building')
        self.assertEqual(str(building), 'Test Building')
    
    def test_latitude_validation_min(self):
        building = Building(
            name='Test',
            slug='test',
            latitude=-91,
            longitude=120.984222
        )
        with self.assertRaises(ValidationError) as context:
            building.clean()
        self.assertIn('latitude', str(context.exception))
    
    def test_latitude_validation_max(self):
        building = Building(
            name='Test',
            slug='test',
            latitude=91,
            longitude=120.984222
        )
        with self.assertRaises(ValidationError) as context:
            building.clean()
        self.assertIn('latitude', str(context.exception))
    
    def test_longitude_validation_min(self):
        building = Building(
            name='Test',
            slug='test',
            latitude=14.599512,
            longitude=-181
        )
        with self.assertRaises(ValidationError) as context:
            building.clean()
        self.assertIn('longitude', str(context.exception))
    
    def test_longitude_validation_max(self):
        building = Building(
            name='Test',
            slug='test',
            latitude=14.599512,
            longitude=181
        )
        with self.assertRaises(ValidationError) as context:
            building.clean()
        self.assertIn('longitude', str(context.exception))


class GeofenceModelTest(TestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.599512,
            longitude=120.984222
        )
    
    def test_geofence_creation(self):
        geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=50.0
        )
        self.assertEqual(geofence.building, self.building)
        self.assertEqual(str(geofence), 'Geofence for Test Building')
    
    def test_radius_validation_zero(self):
        geofence = Geofence(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=0
        )
        with self.assertRaises(ValidationError) as context:
            geofence.clean()
        self.assertIn('radius_meters', str(context.exception))
    
    def test_radius_validation_negative(self):
        geofence = Geofence(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=-10
        )
        with self.assertRaises(ValidationError) as context:
            geofence.clean()
        self.assertIn('radius_meters', str(context.exception))
    
    def test_geofence_latitude_validation(self):
        geofence = Geofence(
            building=self.building,
            latitude=95,
            longitude=120.984222,
            radius_meters=50
        )
        with self.assertRaises(ValidationError) as context:
            geofence.clean()
        self.assertIn('latitude', str(context.exception))
    
    def test_geofence_longitude_validation(self):
        geofence = Geofence(
            building=self.building,
            latitude=14.599512,
            longitude=200,
            radius_meters=50
        )
        with self.assertRaises(ValidationError) as context:
            geofence.clean()
        self.assertIn('longitude', str(context.exception))


class BuildingAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='password123',
            role='admin'
        )
        self.admin.email_verified = True
        self.admin.save()
        
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='password123',
            role='student'
        )
        self.student.email_verified = True
        self.student.save()
        self.building = Building.objects.create(
            name='CCS Building',
            slug='ccs-building',
            description='Computer Science Building',
            latitude=14.599512,
            longitude=120.984222,
            is_active=True
        )
        self.inactive_building = Building.objects.create(
            name='Old Building',
            slug='old-building',
            latitude=14.599512,
            longitude=120.984222,
            is_active=False
        )
    
    def test_list_buildings_active_only(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/buildings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'CCS Building')
    
    def test_create_building_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'New Building',
            'slug': 'new-building',
            'description': 'A new building',
            'latitude': 14.5,
            'longitude': 120.9,
            'is_active': True
        }
        response = self.client.post('/api/buildings/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'New Building')
    
    def test_create_building_non_admin(self):
        self.client.force_authenticate(user=self.student)
        data = {
            'name': 'New Building',
            'slug': 'new-building',
            'latitude': 14.5,
            'longitude': 120.9
        }
        response = self.client.post('/api/buildings/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['success'])
    
    def test_create_building_anonymous(self):
        data = {
            'name': 'New Building',
            'slug': 'new-building',
            'latitude': 14.5,
            'longitude': 120.9
        }
        response = self.client.post('/api/buildings/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_building_invalid_latitude(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Invalid Building',
            'slug': 'invalid-building',
            'latitude': 95,
            'longitude': 120.9
        }
        response = self.client.post('/api/buildings/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    def test_create_building_invalid_longitude(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Invalid Building',
            'slug': 'invalid-building',
            'latitude': 14.5,
            'longitude': 200
        }
        response = self.client.post('/api/buildings/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_building_detail(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'CCS Building')
    
    def test_get_inactive_building_non_admin(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.inactive_building.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_inactive_building_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/buildings/{self.inactive_building.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], 'Old Building')
    
    def test_update_building_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {'description': 'Updated description'}
        response = self.client.patch(f'/api/buildings/{self.building.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['description'], 'Updated description')
    
    def test_update_building_non_admin(self):
        self.client.force_authenticate(user=self.student)
        data = {'description': 'Updated'}
        response = self.client.patch(f'/api/buildings/{self.building.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_building_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/buildings/{self.building.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Building.objects.filter(id=self.building.id).exists())
    
    def test_delete_building_non_admin(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(f'/api/buildings/{self.building.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class GeofenceAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='password123',
            role='admin'
        )
        self.admin.email_verified = True
        self.admin.save()
        
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='password123',
            role='student'
        )
        self.student.email_verified = True
        self.student.save()
        self.building = Building.objects.create(
            name='CCS Building',
            slug='ccs-building',
            latitude=14.599512,
            longitude=120.984222,
            is_active=True
        )
    
    def test_create_geofence_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'latitude': 14.599512,
            'longitude': 120.984222,
            'radius_meters': 50.0,
            'is_active': True
        }
        response = self.client.post(f'/api/buildings/{self.building.id}/geofence/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(float(response.data['data']['radius_meters']), 50.0)
    
    def test_create_geofence_non_admin(self):
        self.client.force_authenticate(user=self.student)
        data = {
            'latitude': 14.599512,
            'longitude': 120.984222,
            'radius_meters': 50.0
        }
        response = self.client.post(f'/api/buildings/{self.building.id}/geofence/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_geofence_invalid_radius(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'latitude': 14.599512,
            'longitude': 120.984222,
            'radius_meters': 0
        }
        response = self.client.post(f'/api/buildings/{self.building.id}/geofence/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_geofence(self):
        geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=50.0,
            is_active=True
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/geofence/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['id'], geofence.id)
    
    def test_get_geofence_none(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/buildings/{self.building.id}/geofence/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['data'])
    
    def test_update_geofence_admin(self):
        geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=50.0,
            is_active=True
        )
        self.client.force_authenticate(user=self.admin)
        data = {'radius_meters': 100.0}
        response = self.client.patch(f'/api/buildings/geofence/{geofence.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['data']['radius_meters']), 100.0)
    
    def test_update_geofence_non_admin(self):
        geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.599512,
            longitude=120.984222,
            radius_meters=50.0
        )
        self.client.force_authenticate(user=self.student)
        data = {'radius_meters': 100.0}
        response = self.client.patch(f'/api/buildings/geofence/{geofence.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)




class BuildingUnlockTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
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
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.5995,
            longitude=120.9842,
            is_active=True
        )
        self.geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.5995,
            longitude=120.9842,
            radius_meters=50,
            is_active=True
        )

    def test_unlock_inside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['building'], self.building.id)
        self.assertEqual(response.data['data']['source'], 'geofence')
        
        self.assertTrue(
            BuildingUnlock.objects.filter(user=self.user, building=self.building).exists()
        )

    def test_unlock_outside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.6100,
            'longitude': 121.0000,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])
        
        self.assertFalse(
            BuildingUnlock.objects.filter(user=self.user, building=self.building).exists()
        )

    def test_repeated_unlock_no_duplicate(self):
        self.client.force_authenticate(user=self.user)
        
        response1 = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response1.status_code, 200)
        
        response2 = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response2.status_code, 200)
        
        count = BuildingUnlock.objects.filter(user=self.user, building=self.building).count()
        self.assertEqual(count, 1)

    def test_anonymous_cannot_unlock(self):
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 401)

    def test_unlocked_buildings_student(self):
        BuildingUnlock.objects.create(
            user=self.user,
            building=self.building,
            source='geofence'
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/buildings/unlocked/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['id'], self.building.id)
        self.assertEqual(response.data['data'][0]['unlock_source'], 'geofence')

    def test_unlocked_buildings_professional_gets_all(self):
        self.client.force_authenticate(user=self.professional)
        response = self.client.get('/api/buildings/unlocked/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['id'], self.building.id)
        self.assertEqual(response.data['data'][0]['unlock_source'], 'role_access')



class BuildingUnlockTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
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
        self.building = Building.objects.create(
            name='Test Building',
            slug='test-building',
            latitude=14.5995,
            longitude=120.9842,
            is_active=True
        )
        self.geofence = Geofence.objects.create(
            building=self.building,
            latitude=14.5995,
            longitude=120.9842,
            radius_meters=50,
            is_active=True
        )

    def test_unlock_inside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['building'], self.building.id)
        self.assertTrue(
            BuildingUnlock.objects.filter(user=self.user, building=self.building).exists()
        )

    def test_unlock_outside_geofence(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.6100,
            'longitude': 121.0000,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            BuildingUnlock.objects.filter(user=self.user, building=self.building).exists()
        )

    def test_repeated_unlock_no_duplicate(self):
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        count = BuildingUnlock.objects.filter(user=self.user, building=self.building).count()
        self.assertEqual(count, 1)

    def test_anonymous_cannot_unlock(self):
        response = self.client.post('/api/buildings/unlock/', {
            'latitude': 14.5995,
            'longitude': 120.9842,
            'accuracy_meters': 10
        })
        self.assertEqual(response.status_code, 401)

    def test_professional_gets_all_buildings(self):
        self.client.force_authenticate(user=self.professional)
        response = self.client.get('/api/buildings/unlocked/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['unlock_source'], 'role_access')
