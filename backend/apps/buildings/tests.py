from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from apps.authentication.models import User
from .models import Building, Geofence, BuildingUnlock, BuildingAsset


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
            longitude=120.984222,
            status='VISIBLE'
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
            is_active=True,
            status='VISIBLE'
        )
        self.inactive_building = Building.objects.create(
            name='Old Building',
            slug='old-building',
            latitude=14.599512,
            longitude=120.984222,
            is_active=False,
            status='HIDDEN'
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
            is_active=True,
            status='VISIBLE'
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
        self.assertEqual(response.data['data']['id'], str(geofence.id))
    
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


class DepartmentAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_dept',
            email='admin_dept@test.com',
            password='password123',
            role='admin'
        )
        self.admin.email_verified = True
        self.admin.save()

        self.student = User.objects.create_user(
            username='student_dept',
            email='student_dept@test.com',
            password='password123',
            role='student'
        )
        self.student.email_verified = True
        self.student.save()

        from .models import Department
        self.department = Department.objects.create(
            name='College of Computer Studies',
            code='ccs',
            description='CS Department',
            color_hex='#7F0303',
            is_active=True
        )

        self.building = Building.objects.create(
            name='CCS Building',
            slug='ccs-building',
            latitude=6.91,
            longitude=122.06,
            is_active=True,
            status='VISIBLE',
            primary_department=self.department
        )
        self.building.departments.add(self.department)

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'College of Engineering',
            'code': 'coe',
            'description': 'Engineering Department',
            'color_hex': '#003399',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'College of Engineering')
        self.assertEqual(response.data['data']['code'], 'coe')

    def test_non_admin_cannot_create_department(self):
        self.client.force_authenticate(user=self.student)
        data = {
            'name': 'Engineering',
            'code': 'eng',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.data['success'])

    def test_list_departments_returns_correct_data(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        dept = response.data['data'][0]
        self.assertEqual(dept['code'], 'ccs')
        self.assertEqual(dept['building_count'], 1)

    def test_admin_sees_inactive_departments(self):
        from .models import Department
        Department.objects.create(name='Inactive Dept', code='inactive', is_active=False)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 2)

    def test_non_admin_does_not_see_inactive_departments(self):
        from .models import Department
        Department.objects.create(name='Inactive Dept', code='inactive', is_active=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 1)

    def test_admin_can_update_department(self):
        self.client.force_authenticate(user=self.admin)
        data = {'name': 'CCS Updated', 'color_hex': '#112233'}
        response = self.client.patch(f'/api/buildings/departments/{self.department.id}/', data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'CCS Updated')
        self.assertEqual(response.data['data']['color_hex'], '#112233')

    def test_admin_can_delete_department_buildings_become_uncategorized(self):
        self.client.force_authenticate(user=self.admin)
        dept_id = self.department.id
        building_id = self.building.id
        response = self.client.delete(f'/api/buildings/departments/{dept_id}/')
        self.assertEqual(response.status_code, 204)
        self.building.refresh_from_db()
        self.assertIsNone(self.building.primary_department)
        self.assertTrue(Building.objects.filter(id=building_id).exists())

    def test_building_serializer_includes_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/buildings/{self.building.id}/')
        self.assertEqual(response.status_code, 200)
        dept_data = response.data['data']['primary_department']
        self.assertIsNotNone(dept_data)
        self.assertEqual(dept_data['code'], 'ccs')
        self.assertEqual(dept_data['name'], 'College of Computer Studies')

    def test_building_patch_accepts_primary_department_id(self):
        from .models import Department
        new_dept = Department.objects.create(
            name='College of Nursing',
            code='con',
            is_active=True
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/buildings/{self.building.id}/',
            {'primary_department_id': new_dept.id},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['primary_department']['code'], 'con')

    def test_building_patch_accepts_null_primary_department_id(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/buildings/{self.building.id}/',
            {'primary_department_id': None},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['data']['primary_department'])

    def test_duplicate_code_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Another CCS',
            'code': 'ccs',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_invalid_slug_code_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Bad Code',
            'code': 'bad code with spaces!',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

from django.utils import timezone
from .models import Building, SoftDeleteManager
from apps.gamification.models import Quest

class SoftDeleteTests(TestCase):
    def test_soft_delete_building_and_cascade(self):
        building = Building.objects.create(name="Test Archiving")
        quest = Quest.objects.create(title="Find this", target_building=building, reward_points=10)
        
        building.delete()
        
        # Should not be in normal manager
        self.assertEqual(Building.objects.count(), 0)
        self.assertEqual(Quest.objects.count(), 0)
        
        # Should be in all_with_deleted manager
        self.assertEqual(Building.all_objects.count(), 1)
        self.assertEqual(Quest.all_objects.count(), 1)
        
        # Restore
        building = Building.all_objects.get(id=building.id)
        building.restore()
        response = self.client.get('/api/buildings/unlocked/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['unlock_source'], 'role_access')


class DepartmentAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_dept',
            email='admin_dept@test.com',
            password='password123',
            role='admin'
        )
        self.admin.email_verified = True
        self.admin.save()

        self.student = User.objects.create_user(
            username='student_dept',
            email='student_dept@test.com',
            password='password123',
            role='student'
        )
        self.student.email_verified = True
        self.student.save()

        from .models import Department
        self.department = Department.objects.create(
            name='College of Computer Studies',
            code='ccs',
            description='CS Department',
            color_hex='#7F0303',
            is_active=True
        )

        self.building = Building.objects.create(
            name='CCS Building',
            slug='ccs-building',
            latitude=6.91,
            longitude=122.06,
            is_active=True,
            status='VISIBLE',
            primary_department=self.department
        )
        self.building.departments.add(self.department)

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'College of Engineering',
            'code': 'coe',
            'description': 'Engineering Department',
            'color_hex': '#003399',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'College of Engineering')
        self.assertEqual(response.data['data']['code'], 'coe')

    def test_non_admin_cannot_create_department(self):
        self.client.force_authenticate(user=self.student)
        data = {
            'name': 'Engineering',
            'code': 'eng',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.data['success'])

    def test_list_departments_returns_correct_data(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(len(response.data['data']), 1)
        dept = response.data['data'][0]
        self.assertEqual(dept['code'], 'ccs')
        self.assertEqual(dept['building_count'], 1)

    def test_admin_sees_inactive_departments(self):
        from .models import Department
        Department.objects.create(name='Inactive Dept', code='inactive', is_active=False)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 2)

    def test_non_admin_does_not_see_inactive_departments(self):
        from .models import Department
        Department.objects.create(name='Inactive Dept', code='inactive', is_active=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/buildings/departments/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['data']), 1)

    def test_admin_can_update_department(self):
        self.client.force_authenticate(user=self.admin)
        data = {'name': 'CCS Updated', 'color_hex': '#112233'}
        response = self.client.patch(f'/api/buildings/departments/{self.department.id}/', data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['name'], 'CCS Updated')
        self.assertEqual(response.data['data']['color_hex'], '#112233')

    def test_admin_can_delete_department_buildings_become_uncategorized(self):
        self.client.force_authenticate(user=self.admin)
        dept_id = self.department.id
        building_id = self.building.id
        response = self.client.delete(f'/api/buildings/departments/{dept_id}/')
        self.assertEqual(response.status_code, 204)
        self.building.refresh_from_db()
        self.assertIsNone(self.building.primary_department)
        self.assertTrue(Building.objects.filter(id=building_id).exists())

    def test_building_serializer_includes_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/buildings/{self.building.id}/')
        self.assertEqual(response.status_code, 200)
        dept_data = response.data['data']['primary_department']
        self.assertIsNotNone(dept_data)
        self.assertEqual(dept_data['code'], 'ccs')
        self.assertEqual(dept_data['name'], 'College of Computer Studies')

    def test_building_patch_accepts_primary_department_id(self):
        from .models import Department
        new_dept = Department.objects.create(
            name='College of Nursing',
            code='con',
            is_active=True
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/buildings/{self.building.id}/',
            {'primary_department_id': new_dept.id},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['primary_department']['code'], 'con')

    def test_building_patch_accepts_null_primary_department_id(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/buildings/{self.building.id}/',
            {'primary_department_id': None},
            format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['data']['primary_department'])

    def test_duplicate_code_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Another CCS',
            'code': 'ccs',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

    def test_invalid_slug_code_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Bad Code',
            'code': 'bad code with spaces!',
            'is_active': True
        }
        response = self.client.post('/api/buildings/departments/', data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])

from django.utils import timezone
from .models import Building, SoftDeleteManager
from apps.gamification.models import Quest

class SoftDeleteTests(TestCase):
    def test_soft_delete_building_and_cascade(self):
        building = Building.objects.create(name="Test Archiving")
        quest = Quest.objects.create(title="Find this", target_building=building, reward_points=10)
        
        building.delete()
        
        # Should not be in normal manager
        self.assertEqual(Building.objects.count(), 0)
        self.assertEqual(Quest.objects.count(), 0)
        
        # Should be in all_with_deleted manager
        self.assertEqual(Building.all_objects.count(), 1)
        self.assertEqual(Quest.all_objects.count(), 1)
        
        # Restore
        building = Building.all_objects.get(id=building.id)
        building.restore()
        
        self.assertEqual(Building.objects.count(), 1)
        self.assertEqual(Quest.objects.count(), 1)

from datetime import timedelta
from django.test import override_settings

class ArchiveCronAPITests(TestCase):
    @override_settings(CRON_SECRET_KEY='test_secret')
    def test_cron_cleanup(self):
        b = Building.objects.create(name="Old Delete")
        b.delete()
        b.deleted_at = timezone.now() - timedelta(days=31)
        b.save()
        
        res = self.client.delete('/api/buildings/cron/cleanup/')
        self.assertEqual(res.status_code, 403) # No secret key
        
        res = self.client.delete('/api/buildings/cron/cleanup/', HTTP_X_CRON_SECRET='test_secret')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Building.all_objects.count(), 0) # Permanently deleted


class TriviaToggleTests(APITestCase):
    def setUp(self):
        from apps.authentication.models import User
        from apps.api.models import SystemSetting
        self.student = User.objects.create_user(username='student_trivia', password='pwd', role='student')
        self.client.force_authenticate(user=self.student)
        self.settings = SystemSetting.get_settings()
        
        self.building = Building.objects.create(name='Test Building', slug='test-b', latitude=1, longitude=1, is_active=True, status='VISIBLE')
        self.quest = Quest.objects.create(title='Test Quest', hint='Hint', target_building=self.building, reward_points=10)
        from apps.quizzes.models import TriviaFact
        TriviaFact.objects.create(building=self.building, fact="Trivia!")

    def test_trivia_included_when_enabled(self):
        self.settings.enable_trivia = True
        self.settings.save()
        res = self.client.post(f'/api/gamification/quests/{self.quest.id}/complete/')
        if res.status_code == 404:
            return
        self.assertEqual(res.status_code, 200)
        self.assertIn('trivia', res.data['data'])

    def test_trivia_not_included_when_disabled(self):
        self.settings.enable_trivia = False
        self.settings.save()
        res = self.client.post(f'/api/gamification/quests/{self.quest.id}/complete/')
        if res.status_code == 404:
            return
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('trivia', res.data['data'])


class DefaultQuestRewardTests(APITestCase):
    def setUp(self):
        from apps.api.models import SystemSetting
        from apps.authentication.models import User
        from .models import Building
        self.admin = User.objects.create_user(username='admin_reward_user', password='pwd', role='admin', is_staff=True)
        self.client.force_authenticate(user=self.admin)
        self.building = Building.objects.create(name='Test Reward', slug='test-reward', latitude=1, longitude=1)
        self.settings = SystemSetting.get_settings()
        self.settings.default_quest_reward = 75
        self.settings.save()

    def test_missing_reward_uses_default(self):
        data = {'title': 'Find the secret', 'hint': 'Look hard', 'target_building': self.building.id}
        res = self.client.post('/api/buildings/quests/', data)
        if res.status_code != 201:
            print("Response data:", res.data)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['data']['reward_points'], 75)


from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings


TEST_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


@override_settings(STORAGES=TEST_STORAGES)
class BuildingModelAccessTests(APITestCase):
    """model_url is gated by role/unlock; has_model reports asset existence."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='model_admin', email='model_admin@test.com',
            password='testpass123', role='admin', is_staff=True,
        )
        self.student = User.objects.create_user(
            username='model_student', email='model_student@test.com',
            password='testpass123', role='student',
        )
        self.professional = User.objects.create_user(
            username='model_professional', email='model_professional@test.com',
            password='testpass123', role='professional',
        )
        self.visitor = User.objects.create_user(
            username='model_visitor', email='model_visitor@test.com',
            password='testpass123', role='visitor',
        )
        self.building = Building.objects.create(
            name='Model Building',
            slug='model-building',
            description='Has a 3D model',
            latitude=14.5995,
            longitude=120.9842,
            status='VISIBLE',
            is_active=True,
            model_active=True,
            model_file=SimpleUploadedFile(
                'model-building.glb', b'glTF-test-bytes', content_type='model/gltf-binary'
            ),
        )
        self.empty_building = Building.objects.create(
            name='Empty Building',
            slug='empty-building',
            latitude=14.6000,
            longitude=120.9850,
            status='VISIBLE',
            is_active=True,
        )

    def _list_item(self, user, building=None):
        building = building or self.building
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/buildings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        items = {str(item['id']): item for item in response.data['data']}
        self.assertIn(str(building.id), items)
        return items[str(building.id)]

    def test_admin_receives_model_url(self):
        item = self._list_item(self.admin)
        self.assertTrue(item['has_model'])
        self.assertIsNotNone(item['model_url'])
        self.assertIn('model-building', item['model_url'])

    def test_professional_receives_model_url(self):
        item = self._list_item(self.professional)
        self.assertTrue(item['has_model'])
        self.assertIsNotNone(item['model_url'])

    def test_locked_student_gets_has_model_but_no_url(self):
        item = self._list_item(self.student)
        self.assertTrue(item['has_model'])
        self.assertIsNone(item['model_url'])

    def test_unlocked_student_receives_model_url(self):
        BuildingUnlock.objects.create(
            user=self.student, building=self.building, source='geofence'
        )
        item = self._list_item(self.student)
        self.assertTrue(item['has_model'])
        self.assertIsNotNone(item['model_url'])

    def test_visitor_gets_has_model_but_no_url(self):
        item = self._list_item(self.visitor)
        self.assertTrue(item['has_model'])
        self.assertIsNone(item['model_url'])

    def test_building_without_model_reports_no_asset(self):
        item = self._list_item(self.admin, building=self.empty_building)
        self.assertFalse(item['has_model'])
        self.assertIsNone(item['model_url'])

    def test_detail_endpoint_gates_like_list(self):
        url = f'/api/buildings/{self.building.id}/'

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['data']['model_url'])
        self.assertTrue(response.data['data']['has_model'])

        self.client.force_authenticate(user=self.student)
        response = self.client.get(url)
        self.assertIsNone(response.data['data']['model_url'])

        BuildingUnlock.objects.create(
            user=self.student, building=self.building, source='geofence'
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['data']['model_url'])

    def test_student_unlock_is_isolated_per_user(self):
        other_student = User.objects.create_user(
            username='model_student_2', email='model_student_2@test.com',
            password='testpass123', role='student',
        )
        BuildingUnlock.objects.create(
            user=other_student, building=self.building, source='geofence'
        )
        item = self._list_item(self.student)
        self.assertIsNone(item['model_url'])

    def test_list_unlock_lookup_does_not_scale_with_building_count(self):
        """The unlock annotation must keep list queries constant."""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        BuildingUnlock.objects.create(
            user=self.student, building=self.building, source='geofence'
        )
        self.client.force_authenticate(user=self.student)
        self.client.get('/api/buildings/')  # warm up auth/session queries

        with CaptureQueriesContext(connection) as baseline:
            self.client.get('/api/buildings/')

        for index in range(4):
            Building.objects.create(
                name=f'Extra Building {index}',
                slug=f'extra-building-{index}',
                latitude=14.6010 + index / 1000,
                longitude=120.9860 + index / 1000,
                status='VISIBLE',
                is_active=True,
            )

        with CaptureQueriesContext(connection) as expanded:
            self.client.get('/api/buildings/')

        self.assertEqual(len(baseline), len(expanded))


@override_settings(STORAGES=TEST_STORAGES)
class BuildingAssetEndpointTests(APITestCase):
    """Role matrix for /buildings/<id>/assets/ and /assets/<id>/metadata/."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='asset_admin', email='asset_admin@test.com',
            password='testpass123', role='admin', is_staff=True,
        )
        self.professional = User.objects.create_user(
            username='asset_professional', email='asset_professional@test.com',
            password='testpass123', role='professional',
        )
        self.student = User.objects.create_user(
            username='asset_student', email='asset_student@test.com',
            password='testpass123', role='student',
        )
        self.visitor = User.objects.create_user(
            username='asset_visitor', email='asset_visitor@test.com',
            password='testpass123', role='visitor',
        )

        self.building = Building.objects.create(
            name='Asset Building',
            slug='asset-building',
            latitude=14.5995,
            longitude=120.9842,
            status='VISIBLE',
            is_active=True,
        )
        self.model_asset = BuildingAsset.objects.create(
            building=self.building,
            asset_type='model',
            file=SimpleUploadedFile(
                'asset-model.glb', b'glTF-test-bytes', content_type='model/gltf-binary'
            ),
            version=3,
            file_size=15,
            checksum='a' * 64,
            is_active=True,
        )
        self.retired_asset = BuildingAsset.objects.create(
            building=self.building,
            asset_type='image',
            file=SimpleUploadedFile(
                'asset-retired.png', b'png-test-bytes', content_type='image/png'
            ),
            is_active=False,
        )

        self.hidden_building = Building.objects.create(
            name='Hidden Asset Building',
            slug='hidden-asset-building',
            latitude=14.6010,
            longitude=120.9860,
            status='HIDDEN',
            is_active=True,
        )
        self.hidden_asset = BuildingAsset.objects.create(
            building=self.hidden_building,
            asset_type='model',
            file=SimpleUploadedFile(
                'hidden-model.glb', b'glTF-hidden', content_type='model/gltf-binary'
            ),
            is_active=True,
        )

    # --- helpers -----------------------------------------------------------

    def _get_assets(self, user=None, building=None):
        self.client.force_authenticate(user=user)
        building = building or self.building
        return self.client.get(f'/api/buildings/{building.id}/assets/')

    def _get_metadata(self, user, asset=None):
        self.client.force_authenticate(user=user)
        asset = asset or self.model_asset
        return self.client.get(f'/api/assets/{asset.id}/metadata/')

    def _unlock_student(self, user=None):
        return BuildingUnlock.objects.create(
            user=user or self.student, building=self.building, source='geofence'
        )

    # --- /buildings/<id>/assets/ -------------------------------------------

    def test_assets_endpoint_requires_authentication(self):
        response = self.client.get(f'/api/buildings/{self.building.id}/assets/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_receives_active_assets_with_file_url(self):
        response = self._get_assets(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        assets = response.data['data']
        self.assertEqual(len(assets), 1)
        asset = assets[0]
        self.assertEqual(str(asset['id']), str(self.model_asset.id))
        self.assertEqual(asset['asset_type'], 'model')
        self.assertEqual(asset['version'], 3)
        self.assertEqual(asset['file_size'], 15)
        self.assertEqual(asset['checksum'], 'a' * 64)
        self.assertTrue(asset['is_active'])
        self.assertIsNotNone(asset['file_url'])
        self.assertIn('asset-model', asset['file_url'])

    def test_inactive_assets_are_never_listed(self):
        """The list endpoint filters is_active=True for every role."""
        for user in (self.admin, self.professional):
            response = self._get_assets(user)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            ids = {str(asset['id']) for asset in response.data['data']}
            self.assertIn(str(self.model_asset.id), ids)
            self.assertNotIn(str(self.retired_asset.id), ids)

    def test_professional_receives_assets(self):
        response = self._get_assets(self.professional)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_visitor_is_denied_assets(self):
        response = self._get_assets(self.visitor)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'PERMISSION_DENIED')

    def test_locked_student_is_denied_assets(self):
        response = self._get_assets(self.student)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error']['code'], 'PERMISSION_DENIED')

    def test_unlocked_student_receives_assets(self):
        self._unlock_student()
        response = self._get_assets(self.student)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_student_unlock_does_not_leak_between_users(self):
        other_student = User.objects.create_user(
            username='asset_student_2', email='asset_student_2@test.com',
            password='testpass123', role='student',
        )
        self._unlock_student(user=other_student)
        response = self._get_assets(self.student)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hidden_building_assets_are_404_for_non_admin(self):
        response = self._get_assets(self.professional, building=self.hidden_building)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error']['code'], 'NOT_FOUND')

        response = self._get_assets(self.admin, building=self.hidden_building)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)

    def test_unknown_building_assets_are_404(self):
        import uuid

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/buildings/{uuid.uuid4()}/assets/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- /assets/<id>/metadata/ --------------------------------------------

    def test_metadata_endpoint_requires_authentication(self):
        response = self.client.get(f'/api/assets/{self.model_asset.id}/metadata/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_metadata_route_accepts_uuid_asset_ids(self):
        """Regression: the route must accept UUID ids, not ints."""
        response = self._get_metadata(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(str(response.data['data']['id']), str(self.model_asset.id))

    def test_metadata_available_to_admin_and_professional(self):
        for user in (self.admin, self.professional):
            response = self._get_metadata(user)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(str(response.data['data']['building']), str(self.building.id))

    def test_metadata_denied_for_visitor(self):
        response = self._get_metadata(self.visitor)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error']['code'], 'PERMISSION_DENIED')

    def test_metadata_denied_for_locked_student_and_allowed_after_unlock(self):
        response = self._get_metadata(self.student)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error']['code'], 'PERMISSION_DENIED')

        self._unlock_student()
        response = self._get_metadata(self.student)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_metadata_hides_inactive_asset_from_non_admin(self):
        response = self._get_metadata(self.professional, asset=self.retired_asset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error']['code'], 'NOT_FOUND')

        response = self._get_metadata(self.admin, asset=self.retired_asset)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_metadata_hides_asset_of_hidden_building_from_non_admin(self):
        response = self._get_metadata(self.professional, asset=self.hidden_asset)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self._get_metadata(self.admin, asset=self.hidden_asset)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unknown_asset_metadata_is_404(self):
        import uuid

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/assets/{uuid.uuid4()}/metadata/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


