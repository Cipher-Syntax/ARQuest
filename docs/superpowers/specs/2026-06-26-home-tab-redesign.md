# Mobile Home Tab Redesign

## 1. Overview
The Home Tab (`mobile/src/app/(tabs)/index.js`) acts as the command center for the ARQuest mobile application. It balances both gamification and utility through a "Split Dashboard" glassmorphism card layout, offering users an immediate snapshot of their real-world location status, their game progression, and quick access to core features.

## 2. Architecture & Components

The screen is divided into three primary vertical sections:

### 2.1 The Status Card (Top)
A full-width dashboard header that establishes identity and live environmental awareness.
*   **Data Sources:** 
    *   Identity: `useAuth()` hook for username and role.
    *   Environment: `useLocationTracking()` hook for current GPS coordinates.
*   **Visuals:** 
    *   Exo 2 font for greetings and headers.
    *   A dynamic, pulsating dot indicator reflecting GPS lock status (e.g., Green = "Zone Secured", Amber = "Tracking...").
    *   Wrapped in an `ARGlassCard`.

### 2.2 The Middle Split (Gamification & Utility)
Two equal-width square cards sitting side-by-side, representing the dual nature of the application.
*   **Left Card (Gamification):**
    *   **Purpose:** Show current EXP and Global Rank.
    *   **Data Source:** Fetches from `/api/gamification/leaderboard/` matching the current user, or utilizes cached context.
    *   **Visuals:** Rajdhani font for numbers. Circular progress indicator or large numeric telemetry layout.
*   **Right Card (Utility):**
    *   **Purpose:** Display the nearest physical building target.
    *   **Data Source:** Iterates over the `allBuildings` endpoint/state, calculating proximity via `geofencingService.calculateDistance(lat1, lon1, lat2, lon2)`.
    *   **Visuals:** Rajdhani font for distance readout (e.g., "142m"). Exo 2 for the building name. 

### 2.3 Quick Action Grid (Bottom)
High-accessibility routing buttons preventing the need to stretch to the bottom tab bar.
*   **Actions Included:**
    *   Deploy Scanner (Routes to `/(tabs)/ar`)
    *   Campus Radar (Routes to `/(tabs)/buildings`)
    *   Global Rankings (Routes to `/leaderboard`)
*   **Visuals:** Uses existing `ARButton` components or styled `TouchableOpacity` blocks with Lucide/Ionicons.

## 3. Typography Standardization
This redesign will strictly adhere to the `TYPOGRAPHY.md` taxonomy using the centralized `fonts` constant:
*   `fonts.heading.bold` (Exo 2): Section headers, building names, usernames.
*   `fonts.hud.bold` (Rajdhani): EXP values, rank numbers, distance metrics.
*   `fonts.body.regular` (Inter): Subtitles, helper text.

## 4. Error Handling & Edge Cases
*   **Loading State:** Render skeleton loaders or `ActivityIndicator` within the cards while GPS acquires a lock or leaderboard API returns.
*   **GPS Disabled:** The Right Utility Card should prompt the user to enable location services if `useLocationTracking()` fails or permissions are denied.
*   **Offline Support:** Rely on cached data for Gamification if the `/leaderboard/` API fails.

## 5. Implementation Boundaries
*   Changes are scoped primarily to `mobile/src/app/(tabs)/index.js`.
*   If complex layout code arises (e.g., the pulsating GPS dot), it should be extracted into small, pure components within `mobile/src/components/home/`.
