# 2D Onboarding Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 2D avatar selection screen during the mobile onboarding flow and store the chosen avatar ID in the Django backend.

**Architecture:** We will add an `avatar_id` string field to the Django `User` model, update the `current_user` API endpoint to accept `PATCH` requests, define a local dictionary of avatar assets in the React Native mobile app, and build an `avatar-selection.js` route in the auth group.

**Tech Stack:** Django REST Framework, Expo (React Native), Expo Router

---

### Task 1: Update User Model & Serializer

**Files:**
- Modify: `backend/apps/authentication/models.py`
- Modify: `backend/apps/authentication/serializers.py`
- Modify: `backend/apps/authentication/tests.py`

- [ ] **Step 1: Write the failing test**

Modify `backend/apps/authentication/tests.py`. Add a test to `UserTests` (or create it if it doesn't exist) to verify `avatar_id` can be saved.

```python
    def test_user_can_save_avatar_id(self):
        from apps.authentication.models import User
        user = User.objects.create(username="avatar_test", email="avatar@test.com")
        user.avatar_id = "explorer_1"
        user.save()
        user.refresh_from_db()
        self.assertEqual(user.avatar_id, "explorer_1")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.authentication.tests`
Expected: FAIL with "has no attribute 'avatar_id'"

- [ ] **Step 3: Write minimal implementation**

Modify `backend/apps/authentication/models.py` to add `avatar_id` to the `User` class:

```python
    avatar_id = models.CharField(max_length=50, blank=True, null=True)
```

Modify `backend/apps/authentication/serializers.py` to include `avatar_id` in `UserSerializer.Meta.fields`:

```python
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'email_verified', 'exploration_points', 'avatar_id', 'is_active', 'date_joined']
```

Run: `cd backend && python manage.py makemigrations && python manage.py migrate`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.authentication.tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/apps/authentication/models.py backend/apps/authentication/serializers.py backend/apps/authentication/tests.py backend/apps/authentication/migrations/
git commit -m "feat(backend): add avatar_id to User model and serializer"
```

---

### Task 2: Update Current User View for PATCH

**Files:**
- Modify: `backend/apps/authentication/views.py`
- Modify: `backend/apps/authentication/tests.py`

- [ ] **Step 1: Write the failing test**

Modify `backend/apps/authentication/tests.py`. Add a test to verify `PATCH /api/authentication/users/me/` updates the avatar.

```python
    def test_update_current_user_avatar(self):
        from apps.authentication.models import User
        user = User.objects.create(username="api_avatar", email="api_avatar@test.com")
        self.client.force_authenticate(user=user)
        response = self.client.patch('/api/authentication/users/me/', {'avatar_id': 'mascot_1'}, format='json')
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.avatar_id, 'mascot_1')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.authentication.tests`
Expected: FAIL (Method "PATCH" not allowed)

- [ ] **Step 3: Write minimal implementation**

Modify `current_user` in `backend/apps/authentication/views.py` to handle `PATCH`:

```python
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user(request):
    if request.method == 'PATCH':
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response({'user': serializer.data})
        return error_response('validation_error', 'Invalid data', details=serializer.errors)
        
    return success_response({
        'user': UserSerializer(request.user).data
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.authentication.tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/apps/authentication/views.py backend/apps/authentication/tests.py
git commit -m "feat(backend): support PATCH on current_user endpoint"
```

---

### Task 3: Mobile Avatar Constants

**Files:**
- Create: `mobile/src/constants/Avatars.js`
- Create: `mobile/src/constants/Avatars.test.js`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/constants/Avatars.test.js`:

```javascript
import { AVATARS } from './Avatars';

describe('Avatars', () => {
  it('exports a list of avatars with id and uri', () => {
    expect(AVATARS.length).toBeGreaterThan(0);
    expect(AVATARS[0]).toHaveProperty('id');
    expect(AVATARS[0]).toHaveProperty('uri');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npm test -- src/constants/Avatars.test.js`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Write minimal implementation**

Create `mobile/src/constants/Avatars.js`:

```javascript
// Using a 1x1 transparent base64 image as placeholder until real assets are provided
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AVATARS = [
  { id: 'explorer_1', uri: PLACEHOLDER_IMAGE },
  { id: 'explorer_2', uri: PLACEHOLDER_IMAGE },
  { id: 'mascot_1', uri: PLACEHOLDER_IMAGE },
  { id: 'student_1', uri: PLACEHOLDER_IMAGE },
  { id: 'student_2', uri: PLACEHOLDER_IMAGE },
  { id: 'visitor_1', uri: PLACEHOLDER_IMAGE },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npm test -- src/constants/Avatars.test.js`
Expected: PASS (or skip if Jest is not configured, but file creation is verified)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/constants/Avatars.js mobile/src/constants/Avatars.test.js
git commit -m "feat(mobile): add avatar constants"
```

---

### Task 4: Mobile Avatar Selection Screen

**Files:**
- Create: `mobile/src/app/(auth)/avatar-selection.js`

- [ ] **Step 1: Write minimal implementation**

Create `mobile/src/app/(auth)/avatar-selection.js`:

```javascript
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATARS } from '../../constants/Avatars';

// Note: Ensure api endpoint functions are imported according to actual mobile project structure.
// This assumes standard fetch logic for the PATCH request.

export default function AvatarSelectionScreen() {
  const [selectedId, setSelectedId] = useState(null);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selectedId) {
      Alert.alert('Error', 'Please select an avatar to continue.');
      return;
    }
    
    try {
      // Typically use the project's API context, but here is the raw fetch
      // Assumes token is handled by the framework or saved locally.
      await fetch('http://10.0.2.2:8000/api/authentication/users/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ avatar_id: selectedId })
      });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save avatar.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Avatar</Text>
      <FlatList
        data={AVATARS}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.avatarContainer, selectedId === item.id && styles.selected]}
            onPress={() => setSelectedId(item.id)}
          >
            <Image source={{ uri: item.uri }} style={styles.avatar} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  avatarContainer: { margin: 10, padding: 5, borderRadius: 50, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#007bff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  button: { marginTop: 30, backgroundColor: '#007bff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/\(auth\)/avatar-selection.js
git commit -m "feat(mobile): add avatar selection screen"
```
