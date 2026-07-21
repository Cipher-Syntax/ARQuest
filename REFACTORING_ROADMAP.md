# ARQuest Refactoring Roadmap

**Document Version**: 1.0  
**Last Updated**: 2026-07-21  
**Current Phase**: System Polish & Pre-Launch Optimization  

---

## Overview

This document outlines refactoring recommendations for the ARQuest system organized by priority and impact. These are **recommendations only** — not yet scheduled for implementation. The system is currently functional with 62+ passing tests, but these improvements will strengthen architecture, maintainability, and scalability before public launch.

---

## 🔴 HIGH PRIORITY (Address Before Launch)

### 1. Backend App Bloat — Split `buildings` App

**Current State**:
- The `buildings` Django app contains 14 models mixing unrelated concerns:
  - **Infrastructure**: Building, Department, Geofence
  - **Access Control**: BuildingUnlock
  - **Gamification**: Quest, TriviaFact, QuizQuestion, Badge, UserQuestProgress, UserQuizProgress, UserBadge
- Single `gamification_*.py` files (serializers, views, utils) alongside core business logic

**Problem**:
- Violates single responsibility principle
- Difficult to feature-flag gamification independently
- Confusing module ownership as team grows
- Hard to understand what "buildings app" actually owns

**Recommendation**:
```
Current:
backend/apps/buildings/
├── models.py (14 models)
├── gamification_serializers.py
├── gamification_views.py
├── gamification_urls.py
├── gamification_utils.py
└── ...

Proposed:
backend/apps/buildings/         # Core: Building, Department, Geofence only
backend/apps/gamification/      # Quest, TriviaFact, Badge management
backend/apps/gamification_progress/  # UserQuestProgress, UserQuizProgress, UserBadge
backend/apps/quizzes/           # QuizQuestion and quiz mechanics
```

**Impact**: 
- ✅ Clear ownership and boundaries
- ✅ Easier to maintain/extend gamification independently
- ✅ Simpler to disable features for variants (lite vs. full app)
- ✅ Better code organization for scaling

**Effort**: Medium (1-2 days for migration + tests)

---

### 2. Mobile State Management — Add Centralized State Layer

**Current State**:
- Multiple independent hooks managing state:
  - `useAuth` (auth context)
  - `useLocationTracking` (GPS state)
  - `useRoleAccess` (permission state)
  - `useAssetCache` (asset loading state)
  - `useUnlockedBuildings` (building unlock state)
- Each hook manages its own updates independently

**Problem**:
- **State synchronization risk**: As gamification features grow (streaks, XP, quests), state can diverge
- **Debugging difficulty**: Hard to trace which hook caused a state update
- **Derived state**: Complex calculations across hooks (e.g., "can user unlock building?") require multiple hook calls
- **Race conditions**: GPS update + API response might conflict without coordination
- **Context Hell**: Adding more hooks becomes unmaintainable

**Recommendation**:
```javascript
// Proposed: Centralized state with Zustand or Jotai
// src/stores/
├── authStore.js        // { user, tokens, role, isAuthenticated }
├── locationStore.js    // { latitude, longitude, accuracy, timestamp, permission }
├── gamificationStore.js// { xp, streaks, quests, badges, leaderboard }
├── assetStore.js       // { cachedAssets, loadingStates, errors }
├── buildingStore.js    // { unlockedBuildings, currentBuilding, geofenceStatus }

// Usage:
const { user, role } = useAuthStore();
const { latitude } = useLocationStore();
const { canUnlock, xpNeeded } = useGamificationStore();

// Computed/Selectors:
const isInsideGeofence = useLocationStore(state => 
  calculateDistance(state.latitude, ...) < GEOFENCE_RADIUS
);
```

**Impact**:
- ✅ Single source of truth for app state
- ✅ Easier to debug state changes
- ✅ Prevents state de-sync bugs
- ✅ Scales well as features grow
- ✅ Clear data flow visualization

**Effort**: Medium-High (2-3 days + testing)

---

### 3. Database Query Optimization — N+1 Query Prevention

**Current State**:
- Backend uses Django ORM but lacks explicit query optimization
- Gamification features likely issue multiple queries per request:
  - Get user → get quests → get quest progress → calculate XP
  - Get leaderboard → get all users → get each user's stats

**Problem**:
- **N+1 Queries**: Listing 100 users requires 1 + 100 queries instead of 2
- **Performance cliff**: As user base grows, response times degrade non-linearly
- **Mobile impact**: Slower API responses mean worse UX
- **Server load**: Unnecessary database connections consume resources

**Recommendation**:
```python
# Current (Bad):
def get_user_profile(user_id):
    user = User.objects.get(id=user_id)
    quests = Quest.objects.filter(user=user)  # +1 query per user!
    progress = UserQuestProgress.objects.filter(user=user)
    return {...}

# Proposed (Good):
class UserQuerySet(models.QuerySet):
    def with_gamification(self):
        return self.select_related('profile').prefetch_related(
            'quests',
            'userquestprogress_set',
            'userbadge_set'
        )

# Usage:
users = User.objects.with_gamification()  # 1 efficient query!
```

**Actions**:
- Add `.select_related()` for foreign keys
- Add `.prefetch_related()` for reverse relations
- Create QuerySet factory methods per model
- Add Django Debug Toolbar to detect N+1 queries in dev
- Consider caching for expensive calculations (leaderboard rank)

**Impact**:
- ✅ 5-10x faster API responses for complex queries
- ✅ Prevents performance degradation at scale
- ✅ Reduced database load
- ✅ Better mobile experience

**Effort**: Low (1 day + testing)

---

### 4. WebView Communication Bridge — Formalize Protocol

**Current State**:
- Mobile communicates with WebView (Three.js/360° rendering) via postMessage
- Protocol likely informal or documented only in code

**Problem**:
- **Brittle**: Changes to 3D scene break mobile code silently
- **Desync risk**: Mobile and WebView have different understanding of state
- **Hard to debug**: Communication failures are cryptic
- **Scaling issue**: Adding new features (AR trivia, interactive hotspots) requires ad-hoc changes
- **No contract**: No schema validation for messages

**Recommendation**:
```javascript
// src/services/webViewBridge.js
const WebViewBridge = {
  // Message types with strict schema
  MESSAGES: {
    LOAD_3D_MODEL: 'LOAD_3D_MODEL',
    NAVIGATE_360: 'NAVIGATE_360',
    SHOW_HOTSPOT: 'SHOW_HOTSPOT',
    SET_CAMERA_POSITION: 'SET_CAMERA_POSITION',
    ERROR: 'ERROR',
    READY: 'READY',
  },

  // Request/response with correlation IDs
  async loadModel(model_id, options = {}) {
    const requestId = generateId();
    return this.postMessage({
      type: 'LOAD_3D_MODEL',
      requestId,
      payload: {
        model_id,
        position: options.position || [0, 0, 0],
        rotation: options.rotation || [0, 0, 0],
        scale: options.scale || 1,
      },
      timeout: 5000,
    });
  },

  // Error handling with fallback
  async navigate360(hotspot_id) {
    try {
      return await this.postMessage({...});
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        // Fallback: reload scene
      }
      throw error;
    }
  },
};
```

**Actions**:
- Define JSON schema for all message types
- Implement request/response correlation IDs
- Add timeout + retry logic
- Create message logging for debugging
- Add WebView readiness check before sending commands

**Impact**:
- ✅ Prevents rendering bugs and desync
- ✅ Easier to extend with new features
- ✅ Clear communication contracts
- ✅ Better error diagnostics

**Effort**: Low-Medium (1-2 days)

---

## 🟡 MEDIUM PRIORITY (Address in Next Phase)

### 5. API Error Handling Standardization

**Current State**:
- API response envelope exists: `{ success, data, error }`
- Error types likely inconsistent across endpoints

**Problem**:
- Mobile needs to differentiate: network error vs. 401 vs. business logic (e.g., "can't unlock yet, need more XP")
- User-facing error messages are generic

**Recommendation**:
```python
# Define error codes
class ErrorCode(TextChoices):
    GEOFENCE_OUTSIDE = 'GEOFENCE_OUTSIDE'  # User outside building zone
    UNLOCK_INSUFFICIENT_XP = 'UNLOCK_INSUFFICIENT_XP'  # Needs more points
    ASSET_NOT_FOUND = 'ASSET_NOT_FOUND'  # 3D model missing
    GPS_DISABLED = 'GPS_DISABLED'  # Mobile GPS off
    INVALID_COORDINATES = 'INVALID_COORDINATES'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED'

# API response
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNLOCK_INSUFFICIENT_XP",
    "message": "You need 500 more XP to unlock this building.",
    "details": { "current_xp": 1200, "required_xp": 1700 }
  }
}
```

**Mobile handler**:
```javascript
const handleUnlockError = (error) => {
  switch(error.code) {
    case 'GEOFENCE_OUTSIDE':
      return 'Get closer to the building to unlock it.';
    case 'UNLOCK_INSUFFICIENT_XP':
      return `You need ${error.details.required_xp - error.details.current_xp} more XP.`;
    // ...
  }
};
```

**Impact**:
- ✅ Better UX with contextual error messages
- ✅ Easier client-side error recovery
- ✅ Logging and monitoring improvement

**Effort**: Low (0.5 day)

---

### 6. Mobile Service Layer Organization

**Current State**:
```
src/services/
├── api.js
├── authService.js
├── geofencingService.js
├── offlineQueueService.js
├── roleAccess.js
├── unlockService.js
└── assetService.js
```

**Problem**:
- Hard to discover what services exist
- Unclear dependencies between services
- Difficult for new developers to understand service ownership

**Recommendation**:
```
src/services/
├── auth/
│   ├── authService.js
│   ├── tokenManager.js
│   └── index.js
├── geofencing/
│   ├── geofencingService.js
│   ├── geofenceCalculator.js
│   └── index.js
├── gamification/
│   ├── gamificationService.js
│   ├── unlockService.js
│   ├── questService.js
│   └── index.js
├── assets/
│   ├── assetService.js
│   ├── cacheManager.js
│   └── index.js
├── api.js (core axios instance)
└── index.js (export all services)
```

**Index pattern**:
```javascript
// src/services/gamification/index.js
export { gamificationService } from './gamificationService';
export { unlockService } from './unlockService';
export { questService } from './questService';

// Usage:
import { gamificationService, unlockService } from '@/services/gamification';
```

**Impact**:
- ✅ Better code discoverability
- ✅ Clear ownership
- ✅ Easier onboarding
- ✅ Simpler to add new service domains

**Effort**: Low (0.5-1 day, mostly file reorganization)

---

### 7. Test Data Factories — Add Fixtures for E2E Testing

**Current State**:
- 62+ tests exist but unclear how test data is created
- Likely duplication of test setup code

**Problem**:
- **Duplication**: Every test might create its own user, building, quest
- **Flaky tests**: If factory logic changes, many tests break
- **Hard to write tests**: Complex scenarios require lots of setup code
- **Data inconsistency**: Tests might use different assumptions about data structure

**Recommendation**:
```python
# backend/tests/factories.py
from factory import django, Faker

class UserFactory(django.DjangoModelFactory):
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    role = User.STUDENT

class BuildingFactory(django.DjangoModelFactory):
    class Meta:
        model = Building
    
    name = Faker('city')
    latitude = Faker('latitude')
    longitude = Faker('longitude')
    description = Faker('text')

class GeofenceFactory(django.DjangoModelFactory):
    class Meta:
        model = Geofence
    
    building = django.SubFactory(BuildingFactory)
    latitude = Faker('latitude')
    longitude = Faker('longitude')
    radius_meters = 50

# Usage in tests:
user = UserFactory(role=User.STUDENT)
building = BuildingFactory()
geofence = GeofenceFactory(building=building)
```

**Common test scenarios**:
```python
# backend/tests/scenarios.py
class BuildingScenarios:
    @staticmethod
    def student_inside_geofence():
        """User inside a building's geofence"""
        user = UserFactory(role=User.STUDENT)
        building = BuildingFactory()
        geofence = GeofenceFactory(building=building, latitude=10.5, longitude=20.5)
        user_location = (10.5, 20.5)  # Exact match
        return {'user': user, 'building': building, 'location': user_location}
    
    @staticmethod
    def student_outside_geofence():
        """User outside all geofences"""
        user = UserFactory(role=User.STUDENT)
        geofence = GeofenceFactory(latitude=10.0, longitude=20.0)
        user_location = (50.0, 50.0)  # Far away
        return {'user': user, 'location': user_location}
    
    @staticmethod
    def unlocked_building():
        """Building with user unlock"""
        user = UserFactory()
        building = BuildingFactory()
        unlock = BuildingUnlock.objects.create(user=user, building=building)
        return {'user': user, 'building': building, 'unlock': unlock}
```

**Impact**:
- ✅ Faster test iteration
- ✅ Fewer flaky tests
- ✅ Easier to write new tests
- ✅ Better test data consistency

**Effort**: Low (1 day)

---

### 8. Admin Dashboard Form Patterns — Extract Form Builder

**Current State**:
- Admin Dashboard manages buildings, geofences, quests, trivia
- Each form likely written from scratch

**Problem**:
- **Duplication**: Similar form logic (validation, submission) repeated
- **Inconsistent UX**: Different forms behave differently
- **Hard to extend**: Adding new content types requires duplicating form logic
- **Validation scattered**: Rules for coordinates, radius, XP values not centralized

**Recommendation**:
```javascript
// web/src/components/forms/FormBuilder.jsx
export const FormBuilder = ({ fields, onSubmit, title }) => {
  // Reusable form component with:
  // - Auto layout
  // - Validation
  // - Error display
  // - Submit handling
};

// web/src/forms/templates/
├── GeozoneForm.jsx       // Building + Geofence creation
├── QuestForm.jsx         // Quest setup
├── TriviaForm.jsx        // Trivia content
└── BadgeForm.jsx         // Badge creation

// Validation rules centralized:
// web/src/utils/validators.js
export const validators = {
  coordinate: (value) => {
    if (value < -90 || value > 90) throw new Error('Invalid latitude');
  },
  radius: (value) => {
    if (value <= 0) throw new Error('Radius must be positive');
  },
  xpThreshold: (value) => {
    if (value < 0 || value > MAX_XP) throw new Error('Invalid XP value');
  },
};

// Usage:
<GeozoneForm 
  onSubmit={handleCreateGeofence}
  validators={validators}
/>
```

**Impact**:
- ✅ Faster dashboard feature development
- ✅ Consistent admin UX
- ✅ Easier maintenance
- ✅ Centralized business rule validation

**Effort**: Medium (1-2 days)

---

## 🟢 LOWER PRIORITY (Nice-to-Have)

### 9. Logging & Observability

- Add structured logging to backend (key events: geofence unlock, API errors, asset loads)
- Add mobile event logging (crashes, API timeouts, feature usage)
- Use for debugging production issues
- **Effort**: Low-Medium (1-2 days)

### 10. Caching Strategy Documentation

- Document what gets cached (building metadata, assets, leaderboards)
- When does cache invalidate? (building updated, new quest published)
- Create cache versioning strategy for assets
- **Effort**: Low (0.5 day documentation)

### 11. Component Library Audit

- Document which components are "primitive" vs. feature-specific
- Create style guide / Storybook
- Identify duplicate components
- **Effort**: Low-Medium (1-2 days)

---

## Quick Wins (Small Refactors, High Value)

| Item | Impact | Effort | Time |
|------|--------|--------|------|
| Add request IDs to all API calls | Easier debugging | Low | 0.5 day |
| Create constants file for API endpoints | Easier maintenance | Low | 0.5 day |
| Extract validation functions | Code reuse | Low | 0.5 day |
| Add error boundaries in React | Better error reporting | Low | 0.5 day |
| Create `.env.example` files | Onboarding | Low | 0.5 day |

---

## Implementation Roadmap (Suggested Order)

### Phase 1 (Immediate — Before Launch)
1. Database query optimization (quick, high impact)
2. API error standardization (low effort, improves UX)
3. WebView bridge formalization (medium effort, prevents bugs)

### Phase 2 (Post-Launch, High Value)
1. Backend app reorganization (buildings split)
2. Mobile state management upgrade (centralized store)

### Phase 3 (Scaling)
1. Test factories and scenarios
2. Admin form builder
3. Logging and observability

---

## Summary Table

| Area | Priority | Issue | Fix Complexity | Impact | Time Estimate |
|------|----------|-------|-----------------|--------|-----------------|
| Backend Architecture | 🔴 | App bloat | Medium | High | 1-2 days |
| Mobile State | 🔴 | Multiple hooks | Medium-High | High | 2-3 days |
| Database | 🔴 | N+1 queries | Low | High | 1 day |
| WebView Bridge | 🔴 | Ad-hoc protocol | Medium | High | 1-2 days |
| API Errors | 🟡 | Inconsistent codes | Low | Medium | 0.5 day |
| Mobile Services | 🟡 | Disorganized | Low | Medium | 1 day |
| Test Data | 🟡 | No factories | Low | Medium | 1 day |
| Admin Forms | 🟡 | Repetitive | Medium | Medium | 1-2 days |
| Logging | 🟢 | Missing | Low | Low | 1-2 days |
| Caching Strategy | 🟢 | Undocumented | Low | Low | 0.5 day |
| Component Library | 🟢 | Scattered | Low | Low | 1-2 days |

---

## Notes for Team

- These are recommendations, not mandates
- Prioritize based on current bottlenecks and pain points
- Some can be addressed incrementally without blocking features
- Document decisions on which refactorings to pursue
- Update this roadmap as priorities shift

