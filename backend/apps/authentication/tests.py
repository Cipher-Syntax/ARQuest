from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import User
from .permissions import (
    IsAdminRole, IsStudentRole, IsProfessionalRole, IsVisitorRole,
    IsAdminOrProfessionalRole, IsAuthenticatedWithRole
)
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory


class UserModelTestCase(TestCase):
    def test_user_creation_with_role(self):
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student'
        )
        
        self.assertIsNotNone(user.id)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.role, 'student')
        self.assertTrue(user.check_password('testpass123'))
    
    def test_user_default_role_is_visitor(self):
        user = User.objects.create_user(
            username='testuser2',
            password='testpass123'
        )
        
        self.assertEqual(user.role, 'visitor')
    
    def test_user_can_have_admin_role(self):
        user = User.objects.create_user(
            username='adminuser',
            password='testpass123',
            role='admin'
        )
        
        self.assertEqual(user.role, 'admin')
    
    def test_user_can_have_professional_role(self):
        user = User.objects.create_user(
            username='profuser',
            password='testpass123',
            role='professional'
        )
        
        self.assertEqual(user.role, 'professional')
    
    def test_user_string_representation(self):
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='professional'
        )
        
        self.assertIn('testuser', str(user))
        self.assertIn('Professional', str(user))
    
    def test_user_helper_properties(self):
        admin = User.objects.create_user(username='admin', password='pass', role='admin')
        student = User.objects.create_user(username='student', password='pass', role='student')
        professional = User.objects.create_user(username='prof', password='pass', role='professional')
        visitor = User.objects.create_user(username='visitor', password='pass', role='visitor')
        
        self.assertTrue(admin.is_admin_role)
        self.assertFalse(admin.is_student_role)
        
        self.assertTrue(student.is_student_role)
        self.assertFalse(student.is_admin_role)
        
        self.assertTrue(professional.is_professional_role)
        self.assertFalse(professional.is_visitor_role)
        
        self.assertTrue(visitor.is_visitor_role)
        self.assertFalse(visitor.is_professional_role)

    def test_user_can_save_avatar_id(self):
        from apps.authentication.models import User
        user = User.objects.create(username="avatar_test", email="avatar@test.com")
        user.avatar_id = "explorer_1"
        user.save()
        user.refresh_from_db()
        self.assertEqual(user.avatar_id, "explorer_1")


class LoginTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student'
        )
        self.inactive_user = User.objects.create_user(
            username='inactive',
            password='testpass123',
            role='student',
            is_active=False
        )
    
    def test_login_success_with_valid_credentials(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])
        self.assertIn('user', response.data['data'])
        self.assertEqual(response.data['data']['user']['username'], 'testuser')
        self.assertEqual(response.data['data']['user']['role'], 'student')
    
    def test_login_fails_with_invalid_credentials(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIsNone(response.data['data'])
        self.assertIsNotNone(response.data['error'])
        self.assertEqual(response.data['error']['code'], 'invalid_credentials')
    
    def test_login_fails_for_inactive_user(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'inactive',
            'password': 'testpass123'
        })
        
        # Django's authenticate() returns None for inactive users
        # So the error is "Invalid username or password"
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'invalid_credentials')


class LogoutTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student'
        )
    
    def test_logout_requires_authentication(self):
        response = self.client.post('/api/auth/logout/', {'refresh': 'fake-token'})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_rejects_missing_refresh_token(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/logout/', {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'missing_token')
    
    def test_logout_blacklists_valid_refresh_token(self):
        # Login to get a valid refresh token
        login_response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        refresh_token = login_response.data['data']['refresh']
        
        # Logout with the refresh token
        self.client.force_authenticate(user=self.user)
        logout_response = self.client.post('/api/auth/logout/', {
            'refresh': refresh_token
        })
        
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertTrue(logout_response.data['success'])
        self.assertEqual(logout_response.data['data']['message'], 'Logged out successfully.')


class CurrentUserTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student',
            email='test@example.com'
        )
    
    def test_me_endpoint_rejects_anonymous_requests(self):
        response = self.client.get('/api/auth/me/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_me_endpoint_returns_authenticated_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['username'], 'testuser')
        self.assertEqual(response.data['data']['user']['role'], 'student')
        self.assertEqual(response.data['data']['user']['email'], 'test@example.com')

    def test_update_current_user_avatar(self):
        from apps.authentication.models import User
        user = User.objects.create(username="api_avatar", email="api_avatar@test.com")
        self.client.force_authenticate(user=user)
        response = self.client.patch('/api/auth/me/', {'avatar_id': 'mascot_1'}, format='json')
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.avatar_id, 'mascot_1')


class TokenRefreshTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='student'
        )
    
    def test_token_refresh_returns_new_access_token(self):
        # Login to get refresh token
        login_response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        refresh_token = login_response.data['data']['refresh']
        
        # Refresh the token
        response = self.client.post('/api/auth/token/refresh/', {
            'refresh': refresh_token
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['data'])

    def test_token_refresh_fails_when_user_is_missing(self):
        login_response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        refresh_token = login_response.data['data']['refresh']

        User.objects.filter(username='testuser').delete()

        response = self.client.post('/api/auth/token/refresh/', {
            'refresh': refresh_token
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error']['code'], 'user_not_found')


class RBACPermissionTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = User.objects.create_user(username='admin', password='pass', role='admin')
        self.student = User.objects.create_user(username='student', password='pass', role='student')
        self.professional = User.objects.create_user(username='prof', password='pass', role='professional')
        self.visitor = User.objects.create_user(username='visitor', password='pass', role='visitor')
    
    def test_is_admin_role_allows_admin_users(self):
        request = self.factory.get('/')
        request.user = self.admin
        permission = IsAdminRole()
        
        self.assertTrue(permission.has_permission(request, None))
    
    def test_is_admin_role_rejects_non_admin_users(self):
        request = self.factory.get('/')
        request.user = self.student
        permission = IsAdminRole()
        
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_student_role_allows_student_users(self):
        request = self.factory.get('/')
        request.user = self.student
        permission = IsStudentRole()
        
        self.assertTrue(permission.has_permission(request, None))
    
    def test_is_admin_or_professional_role_allows_admin(self):
        request = self.factory.get('/')
        request.user = self.admin
        permission = IsAdminOrProfessionalRole()
        
        self.assertTrue(permission.has_permission(request, None))
    
    def test_is_admin_or_professional_role_allows_professional(self):
        request = self.factory.get('/')
        request.user = self.professional
        permission = IsAdminOrProfessionalRole()
        
        self.assertTrue(permission.has_permission(request, None))
    
    def test_is_admin_or_professional_role_rejects_student(self):
        request = self.factory.get('/')
        request.user = self.student
        permission = IsAdminOrProfessionalRole()
        
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_admin_or_professional_role_rejects_visitor(self):
        request = self.factory.get('/')
        request.user = self.visitor
        permission = IsAdminOrProfessionalRole()
        
        self.assertFalse(permission.has_permission(request, None))
    
    def test_is_authenticated_with_role_allows_all_valid_roles(self):
        permission = IsAuthenticatedWithRole()
        
        for user in [self.admin, self.student, self.professional, self.visitor]:
            request = self.factory.get('/')
            request.user = user
            self.assertTrue(permission.has_permission(request, None))


from apps.api.models import SystemSetting

class FeatureToggleTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student_toggle', password='pwd', role='student')
        self.client = APIClient()
        self.client.force_authenticate(user=self.student)
        self.settings = SystemSetting.get_settings()
        
    def test_leaderboard_disabled_returns_403(self):
        self.settings.enable_leaderboard = False
        self.settings.save()
        res = self.client.get('/api/auth/leaderboard/')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(res.data['success'])
