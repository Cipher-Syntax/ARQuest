from django.test import TestCase
from .models import User


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
    
    def test_user_string_representation(self):
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='professional'
        )
        
        self.assertIn('testuser', str(user))
        self.assertIn('Professional', str(user))
