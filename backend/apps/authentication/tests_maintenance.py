from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.api.models import SystemSetting

User = get_user_model()

from rest_framework.views import APIView
from rest_framework.response import Response
from django.urls import path
from django.test import override_settings

class DummyProtectedView(APIView):
    def get(self, request):
        return Response({"success": True})

urlpatterns = [
    path('api/dummy/', DummyProtectedView.as_view())
]

@override_settings(ROOT_URLCONF=__name__)
class MaintenanceModeTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', email='s@test.com', password='password123', role='student')
        self.admin = User.objects.create_user(username='admin', email='a@test.com', password='password123', role='admin', is_staff=True)
        self.settings = SystemSetting.get_settings()
        self.settings.maintenance_mode = True
        self.settings.save()

    def test_maintenance_blocks_login_for_student(self):
        # We need to temporarily restore ROOT_URLCONF to test actual login route
        with override_settings(ROOT_URLCONF='backend.urls'):
            res = self.client.post('/api/auth/login/', {'username': 'student', 'password': 'password123'})
            self.assertEqual(res.status_code, 503)

    def test_maintenance_allows_login_for_admin(self):
        with override_settings(ROOT_URLCONF='backend.urls'):
            res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'password123'})
            self.assertEqual(res.status_code, 200)

    def test_maintenance_blocks_api_access_for_student(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/dummy/')
        self.assertEqual(res.status_code, 503)

    def test_maintenance_allows_api_access_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/dummy/')
        self.assertNotEqual(res.status_code, 503)
