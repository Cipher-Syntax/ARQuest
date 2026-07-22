# Caching Strategy & Invalidation Rules

This document outlines the caching policies for the ARQuest system to ensure maximum performance while maintaining data integrity across the Web Dashboard, Mobile App, and Backend API.

## 1. Backend Caching Strategy (Django)

The backend is responsible for caching computationally expensive queries and mostly-static data.

### 1.1 What to Cache
- **Building & Geofence Coordinates:** Highly static data required by all mobile clients for proximity checks. 
- **Trivia & Quests Definitions:** The structure and definitions of gamification elements (not user progress).
- **Public Leaderboards:** Top 10-50 users can be cached to prevent heavy DB hits on the Profile/Leaderboard views.

### 1.2 Invalidation Rules
- **Event-Driven Invalidation:** When an Admin updates a Building or Geofence via the Web Dashboard, the `post_save` and `post_delete` Django signals must clear the associated cache keys instantly (e.g., `cache.delete('all_active_buildings')`).
- **Time-to-Live (TTL):** 
  - Leaderboards: 5 to 15 minutes (to keep competition active but reduce load).
  - Gamification definitions: 24 hours.

### 1.3 Implementation Tools
- **Django Redis:** The primary caching backend. Use `django.core.cache` API for explicit caching.

---

## 2. Mobile App Caching Strategy (React Native)

Mobile devices experience intermittent connectivity, so local caching is crucial for UX and preventing redundant data transfer.

### 2.1 State & API Caching
- **User Progress (EXP, Unlocked Buildings, Badges):** 
  - Store locally using React Context state. 
  - Persist critical session info using `SecureStore` (Token) and `AsyncStorage` (Non-sensitive user preferences).
  - Re-hydrate silently on app boot.
- **Geofence Definitions:**
  - Cache the list of active geofences fetched on startup. Refresh only when the user crosses significant distances or via a daily TTL pull.

### 2.2 Asset Caching (AR & Media)
- **3D Models (.glb, .gltf) & Textures:** 
  - AR objects must be aggressively cached locally to avoid re-downloading large 3D files every time a camera is launched.
  - Utilize `expo-file-system` to download and store AR assets in the document directory.
  - Maintain an `AssetRegistry` mapping model URLs to local file paths.
- **Images:** 
  - Use `expo-image` which includes built-in aggressive disk and memory caching for avatars, stamp cards, and achievement icons.

### 2.3 Cache Invalidation
- **E-Tag / Hash Matching:** When pulling the building list, the API should return a hash or timestamp of the AR models. If the hash changes, the mobile app deletes the local file and re-downloads the new asset.
- **Manual Clear:** Provide a "Clear Cache" button in the Profile/Settings tab so users can manually free up storage space.

---

## 3. Web Dashboard Caching Strategy (React)

The Admin web dashboard requires near-real-time accuracy to prevent overriding edits or viewing stale data.

### 3.1 What to Cache
- **Authentication State:** Persist JWT tokens securely in memory or `HttpOnly` cookies (if configured) / `localStorage`.
- **UI State:** Selected tabs and filters can be stored in URL parameters or SessionStorage so they survive a page reload.

### 3.2 Invalidation Rules
- **No Aggressive API Caching:** Because Admins are actively mutating data (creating buildings, modifying coords), we **avoid** caching `GET` requests on lists like `/api/buildings`. 
- **Stale-While-Revalidate:** If libraries like React Query are introduced, use a strict invalidation pattern where any mutation (POST/PUT/DELETE) automatically invalidates the corresponding list query, ensuring the table repopulates immediately.
