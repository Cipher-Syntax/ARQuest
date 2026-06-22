# Design Spec: 2D Onboarding Avatar Selection

**Date**: 2026-06-22
**Status**: Approved for Implementation

## 1. Overview
The ARQuest mobile application requires a gamification identity system to support leaderboards and user profiles. To solve this, a 2D Avatar Selection feature will be integrated into the new user onboarding flow. Users will select a 2D illustrated profile picture immediately after verifying their OTP. 

## 2. Architecture & Data Flow
To minimize network overhead and keep the onboarding flow fast, the avatar assets (images) will be bundled directly into the mobile application. The backend will only store a string identifier (`avatar_id`) pointing to the local asset.

### 2.1 Backend (Django)
* **Model Update**: Add `avatar_id = models.CharField(max_length=50, blank=True, null=True)` to the `User` model in the `authentication` app.
* **API Update**: Ensure `avatar_id` is exposed in the `UserSerializer` for GET requests and is writable via the `PATCH /api/users/me/` endpoint.

### 2.2 Frontend (React Native / Expo)
* **Asset Management**: A set of 5-10 pre-designed 2D avatar images (e.g., PNGs/SVGs) will be stored in the mobile app's local asset bundle. A constant dictionary mapping `avatar_id` to `require('./assets/avatars/....png')` will be created.
* **Component - AvatarSelectionScreen**: A new screen displaying the available avatars in a grid format. The user selects one, highlighting it, and taps a "Continue" button.
* **User Flow Integration**: 
    1. User completes the registration form.
    2. User enters and verifies the OTP.
    3. User is navigated to `AvatarSelectionScreen`.
    4. Upon selection and tapping "Continue", the app dispatches a `PATCH` request to save the `avatar_id`.
    5. User is navigated to the main dashboard/map.

## 3. Error Handling
* If the `PATCH` request fails (e.g., due to a dropped network connection), the app will display a toast notification ("Failed to save avatar. Please try again.") and keep the user on the selection screen until successful.
* If a user somehow bypasses the screen and has a `null` `avatar_id`, the frontend will gracefully fallback to a default "mystery person" avatar asset.

## 4. Scope
This spec covers ONLY the storage of the avatar ID and the creation of the onboarding selection screen. Implementing the avatar into the leaderboard or profile screens is out of scope for this specific feature build, though this data structure directly supports those future tasks.
