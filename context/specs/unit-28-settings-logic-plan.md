# Unit 28: Settings Logic Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn dummy system settings into functional logic: enforce maintenance mode, auto-fill quest rewards, block disabled gamification endpoints, and expose a public settings API for the mobile app.

**Architecture:** 
- A custom DRF `MaintenanceModePermission` intercepts API requests globally for non-staff users.
- Explicit checks inside gamification views prevent access to disabled features.
- A public API exposes unauthenticated feature flags for the frontend clients.

**Tech Stack:** Django, DRF, React, TailwindCSS.

---

### Task 1: Public Settings API

**Files:**
- Modify: `backend/apps/api/views.py`
- Modify: `backend/apps/api/urls.py`
- Create/Modify: `backend/apps/api/tests.py`

- [ ] **Step 1: Write the failing test**
```python
# Add to backend/apps/api/tests.py
from django.test import TestCase
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
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.api.tests.PublicSettingsAPITests`
Expected: FAIL (404 route not found)

- [ ] **Step 3: Write minimal implementation**
In `backend/apps/api/views.py`, add the public endpoint:
```python
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import SystemSetting

@api_view(['GET'])
@permission_classes([AllowAny])
def public_settings(request):
    settings = SystemSetting.get_settings()
    data = {
        "app_name": settings.app_name,
        "maintenance_mode": settings.maintenance_mode,
        "enable_gps": settings.enable_gps,
        "enable_qr": settings.enable_qr,
        "enable_ar_selfie": settings.enable_ar_selfie,
        "enable_trivia": settings.enable_trivia,
        "enable_accreditation": settings.enable_accreditation,
        "enable_leaderboard": settings.enable_leaderboard,
    }
    return Response({"success": True, "data": data})
```
In `backend/apps/api/urls.py`, add:
```python
from django.urls import path
from .views import get_update_settings, public_settings

urlpatterns = [
    path('', get_update_settings),
    path('public/', public_settings),
]
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.api.tests.PublicSettingsAPITests`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/api/views.py backend/apps/api/urls.py backend/apps/api/tests.py
git commit -m "feat: add public settings endpoint for mobile app"
```

---

### Task 2: Maintenance Mode Enforcement

**Files:**
- Create: `backend/apps/api/permissions.py`
- Modify: `backend/backend/settings.py`
- Modify: `backend/apps/authentication/views.py`
- Create: `backend/apps/authentication/tests_maintenance.py`

- [ ] **Step 1: Write the failing tests**
```python
# Create backend/apps/authentication/tests_maintenance.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.api.models import SystemSetting

User = get_user_model()

class MaintenanceModeTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', email='s@test.com', password='password123', role='student')
        self.admin = User.objects.create_user(username='admin', email='a@test.com', password='password123', role='admin', is_staff=True)
        self.settings = SystemSetting.get_settings()
        self.settings.maintenance_mode = True
        self.settings.save()

    def test_maintenance_blocks_login_for_student(self):
        res = self.client.post('/api/auth/login/', {'username': 'student', 'password': 'password123'})
        self.assertEqual(res.status_code, 503)

    def test_maintenance_allows_login_for_admin(self):
        res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'password123'})
        self.assertEqual(res.status_code, 200)

    def test_maintenance_blocks_api_access_for_student(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/users/leaderboard/') # Example protected route
        self.assertEqual(res.status_code, 503)

    def test_maintenance_allows_api_access_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/users/leaderboard/')
        self.assertNotEqual(res.status_code, 503)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.authentication.tests_maintenance`
Expected: FAIL (200 instead of 503)

- [ ] **Step 3: Write minimal implementation**
Create `backend/apps/api/permissions.py`:
```python
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import APIException
from .models import SystemSetting

class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = 'System is under maintenance.'
    default_code = 'service_unavailable'

class MaintenanceModePermission(BasePermission):
    def has_permission(self, request, view):
        settings = SystemSetting.get_settings()
        if not settings.maintenance_mode:
            return True
        if request.user and request.user.is_staff:
            return True
        raise ServiceUnavailable()
```

In `backend/backend/settings.py`, update `REST_FRAMEWORK`:
```python
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
        'apps.api.permissions.MaintenanceModePermission',
    ],
```

In `backend/apps/authentication/views.py`, update `login` view (since it uses `AllowAny` and bypasses global permissions):
```python
# Inside login view, right after: user = authenticate(...)
        if user and SystemSetting.get_settings().maintenance_mode and not user.is_staff:
            return Response({'success': False, 'error': 'System is under maintenance.'}, status=503)
```
Update `register` view (since it uses `AllowAny`):
```python
# At the top of register view
    if SystemSetting.get_settings().maintenance_mode:
        return Response({'success': False, 'error': 'System is under maintenance. Registration disabled.'}, status=503)
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.authentication.tests_maintenance`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/api/permissions.py backend/backend/settings.py backend/apps/authentication/views.py backend/apps/authentication/tests_maintenance.py
git commit -m "feat: implement global maintenance mode"
```

---

### Task 3: Feature Toggles Enforcement

**Files:**
- Modify: `backend/apps/authentication/views.py` (Leaderboard)
- Modify: `backend/apps/buildings/views.py` (Trivia)
- Modify: `backend/apps/authentication/tests.py`

- [ ] **Step 1: Write the failing tests**
```python
# Add to backend/apps/authentication/tests.py
from apps.api.models import SystemSetting

class FeatureToggleTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', password='pwd', role='student')
        self.client.force_authenticate(user=self.student)
        self.settings = SystemSetting.get_settings()
        
    def test_leaderboard_disabled_returns_403(self):
        self.settings.enable_leaderboard = False
        self.settings.save()
        res = self.client.get('/api/users/leaderboard/')
        self.assertEqual(res.status_code, 403)
        self.assertFalse(res.data['success'])
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.authentication.tests.FeatureToggleTests`
Expected: FAIL (200 instead of 403)

- [ ] **Step 3: Write minimal implementation**
In `backend/apps/authentication/views.py`, inside `leaderboard` AND `student_leaderboard` views:
```python
from apps.api.models import SystemSetting
# At the top of both views:
    if not SystemSetting.get_settings().enable_leaderboard:
        return Response({'success': False, 'error': 'Leaderboard is currently disabled.'}, status=403)
```

In `backend/apps/buildings/views.py`, inside `building_quest_complete` view:
```python
from apps.api.models import SystemSetting
# Find the trivia selection logic: trivia_fact = building.trivia_facts.order_by('?').first()
# Wrap it in:
    trivia_fact = None
    if SystemSetting.get_settings().enable_trivia:
        trivia_fact = building.trivia_facts.order_by('?').first()
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.authentication.tests.FeatureToggleTests`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/authentication/views.py backend/apps/buildings/views.py backend/apps/authentication/tests.py
git commit -m "feat: enforce backend feature toggles for leaderboard and trivia"
```

---

### Task 4: Default Quest Reward Auto-Fill

**Files:**
- Modify: `backend/apps/buildings/views.py`
- Modify: `backend/apps/buildings/tests.py`

- [ ] **Step 1: Write the failing test**
```python
# Add to backend/apps/buildings/tests.py
from apps.api.models import SystemSetting

class DefaultQuestRewardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pwd', role='admin', is_staff=True)
        self.client.force_authenticate(user=self.admin)
        self.building = Building.objects.create(name='Test', slug='test', latitude=1, longitude=1)
        self.settings = SystemSetting.get_settings()
        self.settings.default_quest_reward = 75
        self.settings.save()

    def test_missing_reward_uses_default(self):
        data = {'title': 'Find the secret', 'description': 'Look hard', 'target_building_id': self.building.id}
        res = self.client.post('/api/buildings/quests/', data)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['data']['reward_points'], 75)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.buildings.tests.DefaultQuestRewardTests`
Expected: FAIL (400 Bad Request, missing field)

- [ ] **Step 3: Write minimal implementation**
In `backend/apps/buildings/views.py`, update `quest_list_create` POST block:
```python
from apps.api.models import SystemSetting

# Inside POST block:
    if 'reward_points' not in request.data or not request.data['reward_points']:
        # Ensure request.data is mutable
        if not hasattr(request.data, '_mutable'):
            request.data._mutable = True
        request.data['reward_points'] = SystemSetting.get_settings().default_quest_reward
        
    serializer = QuestWriteSerializer(data=request.data)
```

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.buildings.tests.DefaultQuestRewardTests`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/buildings/views.py backend/apps/buildings/tests.py
git commit -m "feat: auto-fill quest reward points using system setting"
```

---

### Task 5: Frontend CMS Integration

**Files:**
- Modify: `web/src/pages/CmsPage.jsx`

- [ ] **Step 1: Write minimal implementation**
In `CmsPage.jsx`, fetch settings when the component mounts and store them.
When adding a new quest, pre-fill the `reward_points`.
```javascript
import { settingsService } from '../services/settingsService'

// Inside CmsPage component:
const [systemSettings, setSystemSettings] = useState(null)

useEffect(() => {
    // Add inside existing useEffect or new one
    settingsService.getSettings().then(setSystemSettings).catch(console.error)
}, [])

// Update handleAddContent for quests:
const handleAddContent = () => {
    if (activeSubTab === 'quests') {
        setContentFormData({ 
            title: '', 
            description: '', 
            reward_points: systemSettings?.default_quest_reward || 50 
        })
    } else {
        setContentFormData({ title: '', description: '' })
    }
    setEditingContent(null)
    setIsContentModalOpen(true)
}
```

- [ ] **Step 2: Commit**
```bash
git add web/src/pages/CmsPage.jsx
git commit -m "feat: pre-fill quest reward with system setting in CMS"
```
