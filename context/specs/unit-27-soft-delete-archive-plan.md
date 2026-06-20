# Unit 27: Soft Delete & Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement soft delete for buildings (cascading to related gamification content) and an archive management UI with a cron cleanup endpoint.

**Architecture:** A `SoftDeleteModel` with a custom manager hides deleted records automatically. The Admin UI gains an Archives page to restore/hard delete items. A cron job permanently deletes 30-day-old archived items securely using a secret key.

**Tech Stack:** Django, React, TailwindCSS, Axios.

---

### Task 1: Backend Infrastructure (`SoftDeleteModel`)

**Files:**
- Modify: `backend/apps/buildings/models.py:5-15`
- Test: `backend/apps/buildings/tests.py`

- [ ] **Step 1: Write the failing test**
```python
# Add to backend/apps/buildings/tests.py
from django.utils import timezone
from .models import Building, Quest, SoftDeleteManager

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
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.buildings.tests.SoftDeleteTests`
Expected: FAIL with missing `SoftDeleteManager` or `all_objects` attribute.

- [ ] **Step 3: Write minimal implementation**
In `backend/apps/buildings/models.py`, define the abstract model and update `Building`, `Quest`, `Trivia`:
```python
from django.utils import timezone

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])
        self.cascade_soft_delete()

    def cascade_soft_delete(self):
        pass # Override in subclasses

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])
        self.cascade_restore()
        
    def cascade_restore(self):
        pass

    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
```
Update `Building`, `Quest`, `Trivia` to inherit `SoftDeleteModel` instead of `models.Model`.
In `Building`:
```python
    def cascade_soft_delete(self):
        self.quests.all().update(deleted_at=self.deleted_at)
        self.trivias.all().update(deleted_at=self.deleted_at)
        
    def cascade_restore(self):
        self.quests.all_objects.filter(deleted_at__isnull=False).update(deleted_at=None)
        self.trivias.all_objects.filter(deleted_at__isnull=False).update(deleted_at=None)
```

Make sure to run `python manage.py makemigrations` and `python manage.py migrate`.

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.buildings.tests.SoftDeleteTests`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/buildings/models.py backend/apps/buildings/tests.py backend/apps/buildings/migrations/
git commit -m "feat: backend soft delete infrastructure"
```

---

### Task 2: API Endpoints (Archives & Cron)

**Files:**
- Modify: `backend/apps/buildings/views.py`
- Modify: `backend/apps/buildings/urls.py`

- [ ] **Step 1: Write the failing test**
```python
# Add to backend/apps/buildings/tests.py
from datetime import timedelta
class ArchiveCronAPITests(TestCase):
    def test_cron_cleanup(self):
        b = Building.objects.create(name="Old Delete")
        b.delete()
        b.deleted_at = timezone.now() - timedelta(days=31)
        b.save()
        
        res = self.client.delete('/api/buildings/cron/cleanup/')
        self.assertEqual(res.status_code, 403) # No secret key
        
        res = self.client.delete('/api/buildings/cron/cleanup/', HTTP_X_CRON_SECRET='test_secret')
        self.assertEqual(res.status_code, 204)
        self.assertEqual(Building.all_objects.count(), 0) # Permanently deleted
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python manage.py test apps.buildings.tests.ArchiveCronAPITests`
Expected: FAIL with 404 (route not found).

- [ ] **Step 3: Write minimal implementation**
In `views.py`:
```python
from django.conf import settings
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
def building_archived_list(request):
    if not request.user.is_staff:
        return Response({"error": "Forbidden"}, status=403)
    archived = Building.all_objects.filter(deleted_at__isnull=False)
    serializer = BuildingSerializer(archived, many=True)
    return Response({"success": True, "data": serializer.data})

@api_view(['POST'])
def building_restore(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Forbidden"}, status=403)
    try:
        building = Building.all_objects.get(pk=pk, deleted_at__isnull=False)
        building.restore()
        return Response({"success": True})
    except Building.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

@api_view(['DELETE'])
def building_hard_delete(request, pk):
    if not request.user.is_staff:
        return Response({"error": "Forbidden"}, status=403)
    try:
        building = Building.all_objects.get(pk=pk, deleted_at__isnull=False)
        building.hard_delete()
        return Response({"success": True})
    except Building.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def cron_cleanup(request):
    secret = request.headers.get('X-Cron-Secret')
    expected = getattr(settings, 'CRON_SECRET_KEY', 'arq_super_secret_xyz')
    if secret != expected:
        return Response({"error": "Forbidden"}, status=403)
    
    threshold = timezone.now() - timedelta(days=30)
    old_buildings = Building.all_objects.filter(deleted_at__lt=threshold)
    count = old_buildings.count()
    for b in old_buildings:
        b.hard_delete()
        
    return Response({"success": True, "deleted": count}, status=204)
```
In `urls.py`, add routes:
```python
path('archived/', building_archived_list),
path('<int:pk>/restore/', building_restore),
path('<int:pk>/hard-delete/', building_hard_delete),
path('cron/cleanup/', cron_cleanup),
```
*(Ensure `CRON_SECRET_KEY = 'test_secret'` is patched in the test or added to settings fallback)*.

- [ ] **Step 4: Run test to verify it passes**
Run: `python manage.py test apps.buildings.tests.ArchiveCronAPITests`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/apps/buildings/views.py backend/apps/buildings/urls.py backend/apps/buildings/tests.py
git commit -m "feat: archive api and cron cleanup endpoint"
```

---

### Task 3: Web Admin API Service

**Files:**
- Modify: `web/src/services/buildingService.js`

- [ ] **Step 1: Write the failing test / implementation**
Add to `buildingService.js`:
```javascript
    getArchivedBuildings: async () => {
        const response = await api.get('/buildings/archived/');
        return response.data.data;
    },
    restoreBuilding: async (id) => {
        const response = await api.post(`/buildings/${id}/restore/`);
        return response.data;
    },
    hardDeleteBuilding: async (id) => {
        const response = await api.delete(`/buildings/${id}/hard-delete/`);
        return response.data;
    }
```

- [ ] **Step 2: Commit**
```bash
git add web/src/services/buildingService.js
git commit -m "feat: add archive building service methods"
```

---

### Task 4: Web Admin Archive Page

**Files:**
- Create: `web/src/pages/ArchivePage.jsx`
- Modify: `web/src/layouts/Sidebar.jsx`
- Modify: `web/src/App.jsx`

- [ ] **Step 1: Create `ArchivePage.jsx`**
Build a simple table/list using the existing `Card`, `Button`, `Badge` components.
Fetch archived buildings on mount using `buildingService.getArchivedBuildings()`.
Provide "Restore" and "Delete Permanently" action buttons.
```javascript
import { useState, useEffect } from 'react'
import { buildingService } from '../services/buildingService'
import { Card, Button, Badge } from '../components/ui'
import { ArchiveRestore, Trash2 } from 'lucide-react'

export default function ArchivePage() {
    const [archived, setArchived] = useState([])
    
    useEffect(() => { loadArchived() }, [])
    
    const loadArchived = async () => {
        const data = await buildingService.getArchivedBuildings()
        setArchived(data)
    }

    const handleRestore = async (id) => {
        await buildingService.restoreBuilding(id)
        loadArchived()
    }

    const handleHardDelete = async (id) => {
        if(confirm("Are you sure? This cannot be undone.")) {
            await buildingService.hardDeleteBuilding(id)
            loadArchived()
        }
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Archives</h1>
            <p className="text-gray-500">Items here will be permanently deleted after 30 days.</p>
            
            <div className="space-y-4">
                {archived.map(b => (
                    <Card key={b.id} className="flex justify-between items-center p-4">
                        <div>
                            <h3 className="font-bold">{b.name}</h3>
                            <p className="text-xs text-gray-500">Deleted at: {new Date(b.deleted_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleRestore(b.id)} className="bg-brand"><ArchiveRestore size={16} className="mr-2"/> Restore</Button>
                            <Button onClick={() => handleHardDelete(b.id)} variant="danger"><Trash2 size={16} className="mr-2"/> Permanent Delete</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
```

- [ ] **Step 2: Add to App Router & Sidebar**
In `App.jsx`, add `<Route path="/cms/archives" element={<ArchivePage />} />`.
In `Sidebar.jsx`, add the `Archive` link right before the Logout button using the `Archive` or `Trash` icon.

- [ ] **Step 3: Commit**
```bash
git add web/src/pages/ArchivePage.jsx web/src/layouts/Sidebar.jsx web/src/App.jsx
git commit -m "feat: add archives UI page"
```

---

### Task 5: Web Admin Terminology Update

**Files:**
- Modify: `web/src/pages/BuildingsPage.jsx`

- [ ] **Step 1: Update UI Text**
In `BuildingsPage.jsx`, find the delete button and delete modal.
Change the label from "Delete" to "Move to Archive".
Update the confirmation text inside `ConfirmDeleteModal` or the page logic to warn: `"This building will be moved to the Archive and permanently deleted after 30 days."`
Note: The underlying service call `buildingService.deleteBuilding(id)` remains the same, because our backend `delete()` method is now soft-delete by default!

- [ ] **Step 2: Commit**
```bash
git add web/src/pages/BuildingsPage.jsx
git commit -m "style: rename delete to move to archive"
```
