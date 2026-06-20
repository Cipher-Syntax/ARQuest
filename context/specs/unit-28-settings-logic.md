# Unit 28: Settings Logic Integration Spec

## 1. Overview
The Web Admin currently allows modifying various system settings (Maintenance Mode, Feature Toggles, Default Rewards), but these values are not enforced in the backend. This unit implements the core logic to enforce these settings across the API.

## 2. Target Models
- `apps.api.models.SystemSetting` (Already exists)

## 3. Maintenance Mode
- **Goal:** Prevent non-staff users from authenticating and accessing the system during maintenance.
- **Backend Implementation:**
  - Create a custom DRF permission `MaintenanceModePermission` in `backend/apps/api/permissions.py`.
    - If `maintenance_mode` is True, reject requests (Return 503) unless `request.user.is_staff` is True.
    - Add this permission to `DEFAULT_PERMISSION_CLASSES` in `backend/backend/settings.py`.
  - In `backend/apps/authentication/views.py` (which uses `@permission_classes([AllowAny])`):
    - Update `login` and `refresh_token` views.
    - If `maintenance_mode` is True, block the authentication attempt and return `{"success": False, "error": "System is under maintenance."}` with status 503, **unless** the user is `is_staff=True`.
    - Block `register` entirely with 503 if maintenance is active.

## 4. Default Quest Reward
- **Goal:** Auto-fill the `reward_points` when an admin creates a new Quest if left blank.
- **Backend Implementation:**
  - In `backend/apps/buildings/views.py` -> `quest_list_create` (POST):
    - Check if `reward_points` is missing, null, or empty string in `request.data`.
    - If so, fetch `SystemSetting.get_settings().default_quest_reward` and inject it into the payload before serialization.
- **Frontend Implementation:**
  - In `web/src/pages/CmsPage.jsx`:
    - When "New Quest" is clicked, pre-fill the `reward_points` input with the default value from `settingsService`.

## 5. Feature Toggles
- **Goal:** Enforce strict backend blocking for Gamification elements and expose a public settings endpoint for the mobile app to configure its UI dynamically.
- **Backend Enforcement:**
  - **Leaderboard:** In `backend/apps/authentication/views.py` -> `leaderboard` and `student_leaderboard` views:
    - If `enable_leaderboard` is False, return `{"success": False, "error": "Leaderboard is disabled"}` with status 403.
  - **Trivia:** In `backend/apps/buildings/views.py` -> `building_quest_complete`:
    - If `enable_trivia` is False, bypass the trivia selection logic completely and return `None` for the trivia fact in the response.
- **Public Settings Endpoint:**
  - In `backend/apps/api/views.py`:
    - Create `GET /api/settings/public/` decorated with `@permission_classes([AllowAny])`.
    - Return a stripped-down JSON of `SystemSetting` containing only:
      `app_name, maintenance_mode, enable_gps, enable_qr, enable_ar_selfie, enable_trivia, enable_accreditation, enable_leaderboard`.

## 6. Testing Requirements
- **Maintenance Mode:** Test that a student gets 503 on protected routes and login, while an admin gets 200.
- **Default Quest Reward:** Test that sending a POST without `reward_points` uses the default.
- **Feature Toggles:** Test that the leaderboard returns 403 when disabled. Test that quest completion returns no trivia when disabled.

---
*Status: Ready for Plan Generation*
