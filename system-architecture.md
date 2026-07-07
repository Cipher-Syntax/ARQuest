# ARQuest — System Architecture

> Last updated: 2026-06-20

---

## Diagram 1 — High-Level System Overview

The four major layers and how they connect. The Django backend is the single source
of truth. No critical decisions are made on the client.

```mermaid
graph LR
    subgraph MOBILE ["Mobile App\nReact Native · Expo · Android"]
        M1["Auth + JWT\n(SecureStore)"]
        M2["GPS Tracking\n(Expo Location)"]
        M3["Geofencing\n(Haversine + API)"]
        M4["Building Unlock\n(geofence / QR)"]
        M5["Asset Cache\n(3D models / panoramas)"]
        M6["Gamification\n(quests / points)"]
        M7["WebView Rendering\n(Three.js / 360° / VR)"]
    end

    subgraph BACKEND ["Django Backend\nDjango 5 · DRF · SimpleJWT"]
        B1["/api/auth/\nauthentication"]
        B2["/api/buildings/\nbuildings + geofences"]
        B3["/api/geofencing/\nlocation validation"]
        B4["/api/panorama/\nscenes + hotspots"]
        B5["/api/gamification/\nquests + leaderboard"]
        B6["/api/\nhealth · settings · dashboard"]
        B7["RBAC Permission Classes"]
        B8["Django Admin\n(/admin/)"]
    end

    subgraph DATA ["Data Layer"]
        DB[("PostgreSQL\n12 models · 5 apps")]
        MEDIA["Media Storage\nmodels/ · panoramas/ · assets/"]
    end

    subgraph WEB ["Admin Web Dashboard\nReact 19 · Vite · Axios"]
        W1["Auth + JWT\n(localStorage)"]
        W2["Buildings · Departments\nGeofences · Archive"]
        W3["Panorama Manager\n(scenes + hotspots)"]
        W4["Quests · Trivia · Media"]
        W5["Professionals · Users\nLeaderboard"]
        W6["CMS · Settings\n(feature toggles)"]
    end

    MOBILE -->|"REST API\n(JWT Bearer)"| BACKEND
    WEB    -->|"REST API\n(JWT Bearer)"| BACKEND
    BACKEND --> DATA
    B8      --> DATA
```

---

## Diagram 2 — Mobile Application Layer

Internal structure of the React Native Expo app — services, hooks, screens, and WebView renderers.

```mermaid
graph TD
    subgraph CONTEXT ["App Context & State"]
        AUTH_CTX["AuthContext\nJWT tokens · user object · role"]
        ROLE_SVC["roleAccess.js\nclient-side RBAC gate"]
    end

    subgraph SERVICES ["Services  (src/services/)"]
        API_JS["api.js\nAxios instance + JWT interceptors\n+ 401 auto-refresh"]
        AUTH_SVC["authService.js\nlogin · register · logout · me"]
        GEO_SVC["geofencingService.js\nfetchGeofences · validateLocation\nHaversine distance calc"]
        UNLOCK_SVC["unlockService.js\nunlockBuilding · unlockByQR"]
        ASSET_SVC["assetService.js\nfetch versioned asset URLs"]
    end

    subgraph HOOKS ["Hooks  (src/hooks/)"]
        USE_AUTH["useAuth.js\ncontext consumer"]
        USE_GPS["useLocationTracking.js\nExpo Location API\n5s interval · 10m threshold"]
        USE_UNLOCK["useUnlockedBuildings.js\naggregates user unlocked list"]
        USE_CACHE["useAssetCache.js\nlocal model + panorama cache"]
        USE_ROLE["useRoleAccess.js\nrole-aware feature flags"]
    end

    subgraph AUTH_SCREENS ["Auth Screens  (app/(auth)/)"]
        SCR_LOGIN["Login Screen"]
        SCR_REG["Register Screen"]
        SCR_OTP["OTP Verify Screen"]
    end

    subgraph TAB_SCREENS ["Tab Screens  (app/(tabs)/)"]
        SCR_HOME["Home\nQuest Dashboard"]
        SCR_EXPLORE["Explore Map\nMapbox (WebView)"]
        SCR_AR["AR View\nCamera + 3D overlay"]
        SCR_BLDG["Buildings List\nunlocked buildings"]
        SCR_PROF["Profile\nstats + settings"]
    end

    subgraph FULLSCREEN ["Full-screen Screens  (app/)"]
        SCR_3D["Building3DViewer"]
        SCR_PANO["PanoramaViewer"]
        SCR_VT["VirtualTourViewer"]
        SCR_LEAD["Leaderboard"]
    end

    subgraph WEBVIEW ["WebView Rendering Layer  (Three.js)"]
        WV_3D["viewer3d.html\nGLTFLoader · OrbitControls\nauto-fit · zoom"]
        WV_PANO["panorama.html\nThree.js sphere/cylinder\nhotspot raycasting"]
        WV_VR["virtual-tour.html\nMagic Window VR\nGyroscope first-person"]
    end

    AUTH_CTX --> ROLE_SVC
    AUTH_CTX --> API_JS
    API_JS --> AUTH_SVC
    API_JS --> GEO_SVC
    API_JS --> UNLOCK_SVC
    API_JS --> ASSET_SVC

    USE_GPS --> GEO_SVC
    USE_UNLOCK --> UNLOCK_SVC
    USE_CACHE --> ASSET_SVC
    USE_ROLE --> ROLE_SVC

    AUTH_SCREENS --> AUTH_SVC
    TAB_SCREENS --> USE_GPS
    TAB_SCREENS --> USE_UNLOCK
    TAB_SCREENS --> USE_ROLE
    SCR_AR --> USE_CACHE

    SCR_3D --> WV_3D
    SCR_PANO --> WV_PANO
    SCR_VT --> WV_VR
```

---

## Diagram 3 — Backend API Layer

All Django apps, URL namespaces, endpoints, and their database/media interactions.

```mermaid
graph TD
    CLIENT["Client Request\n(Mobile App or Web Dashboard)\nAuthorization: Bearer JWT"]

    subgraph ROUTER ["Django URL Router  (backend/urls.py)"]
        URL_AUTH["/api/auth/"]
        URL_BLDG["/api/buildings/"]
        URL_GEO["/api/geofencing/"]
        URL_PANO["/api/panorama/"]
        URL_GAME["/api/gamification/"]
        URL_ASSET["/api/assets/"]
        URL_API["/api/"]
        URL_ADMIN["/admin/"]
    end

    subgraph AUTH_APP ["App: authentication"]
        EP_REG["POST   register/"]
        EP_OTP["POST   verify-otp/"]
        EP_ROTP["POST  resend-otp/"]
        EP_LOGIN["POST  login/"]
        EP_LOGOUT["POST logout/"]
        EP_ME["GET    me/"]
        EP_REFRESH["POST  token/refresh/"]
        EP_USERS["GET    users/"]
        EP_PROF["POST   users/professional/"]
        EP_LEADER["GET   leaderboard/"]
    end

    subgraph BLDG_APP ["App: buildings"]
        EP_B_LIST["GET/POST     buildings/"]
        EP_B_DETAIL["GET/PATCH/DELETE  buildings/{id}/"]
        EP_B_RESTORE["POST  buildings/{id}/restore/"]
        EP_B_HARD["DELETE  buildings/{id}/hard-delete/"]
        EP_B_ARCHIVE["GET   buildings/archived/"]
        EP_B_DEPT["GET/POST/PATCH/DELETE  departments/"]
        EP_B_GEO["GET/POST   buildings/{id}/geofence/"]
        EP_B_GEO_UPD["PATCH  geofence/{id}/"]
        EP_UNLOCK["POST  unlock/"]
        EP_UNLOCK_QR["POST  unlock/qr/"]
        EP_UNLOCKED["GET   unlocked/"]
        EP_QUESTS["GET/POST  quests/"]
        EP_TRIVIA["GET/POST  trivias/"]
        EP_ASSETS["GET  buildings/{id}/assets/"]
    end

    subgraph GEO_APP ["App: geofencing"]
        EP_GEO_VAL["POST  validate/\nHaversine distance check\nstatus: inside · nearby · outside · weak_signal"]
    end

    subgraph PANO_APP ["App: panorama"]
        EP_P_SCENES["GET/POST  buildings/{id}/scenes/"]
        EP_P_SCENE["GET/PATCH/DELETE  scenes/{id}/admin/"]
        EP_P_WALK["GET  buildings/{id}/walkthrough/"]
        EP_P_HOTSPOT["GET/POST  scenes/{id}/hotspots/"]
        EP_P_HOT_D["PATCH/DELETE  hotspots/{id}/"]
    end

    subgraph GAME_APP ["App: gamification (buildings)"]
        EP_G_LEAD["GET   leaderboard/"]
        EP_G_ACTIVE["GET   quests/active/"]
        EP_G_COMPLETE["POST  quests/{id}/complete/"]
        EP_G_RECENT["GET   recent-activity/"]
    end

    subgraph API_APP ["App: api"]
        EP_HEALTH["GET   health/"]
        EP_DASH["GET    dashboard/"]
        EP_PUB_SET["GET   settings/public/"]
        EP_SETTINGS["GET/PATCH  settings/"]
    end

    subgraph RBAC ["RBAC Permission Classes"]
        P_ADMIN["IsAdminRole\nfull write access"]
        P_STUDENT["IsStudentRole\nstudent features only"]
        P_PROF["IsProfessionalRole\naccreditor access"]
        P_BOTH["IsAdminOrProfessionalRole\nshared endpoints"]
        P_ANY["IsAuthenticatedWithRole\nany logged-in role"]
    end

    subgraph JWT_SVC ["JWT  (SimpleJWT)"]
        JWT_ACCESS["Access Token\n60 min expiry"]
        JWT_REFRESH["Refresh Token\n7 day expiry\nblacklist on logout"]
    end

    subgraph DATA ["Data Layer"]
        PG[("PostgreSQL")]
        MEDIA_S["Media Storage\nmodels/ · panoramas/ · assets/"]
        EMAIL["Email Provider\nBrevo / Sendinblue"]
    end

    CLIENT --> ROUTER

    URL_AUTH --> AUTH_APP
    URL_BLDG --> BLDG_APP
    URL_GEO  --> GEO_APP
    URL_PANO --> PANO_APP
    URL_GAME --> GAME_APP
    URL_API  --> API_APP

    AUTH_APP --> JWT_SVC
    AUTH_APP --> EMAIL
    ROUTER --> RBAC

    AUTH_APP --> PG
    BLDG_APP --> PG
    GEO_APP  --> PG
    PANO_APP --> PG
    GAME_APP --> PG
    API_APP  --> PG

    BLDG_APP --> MEDIA_S
    PANO_APP --> MEDIA_S

    URL_ADMIN --> PG
```

---

## Diagram 4 — Admin Web Dashboard Layer

React 19 + Vite SPA — pages, routing, and API surface used by each section.

```mermaid
graph TD
    subgraph ENTRY ["Entry & Auth"]
        LOGIN_PG["LoginPage.jsx\nAdmin role verification\nJWT stored in localStorage"]
        PROTECTED["Protected Route\nredirects to /login if no token"]
        AXIOS["api.js  (Axios)\nJWT auto-attach\n401 → token refresh → retry"]
    end

    subgraph SIDEBAR ["Sidebar Navigation"]
        NAV_DASH["Dashboard"]
        NAV_BLDG["Buildings"]
        NAV_DEPT["Departments"]
        NAV_GEO["Geofences"]
        NAV_PANO["Panoramas"]
        NAV_MEDIA["Media"]
        NAV_QUESTS["Quests & Trivia"]
        NAV_PROF["Professional Accounts"]
        NAV_USERS["User Management"]
        NAV_LEAD["Leaderboard"]
        NAV_ARCH["Archive"]
        NAV_SET["CMS / Settings"]
    end

    subgraph PAGES ["Dashboard Pages"]
        PG_DASH["DashboardPage.jsx\nBuilding stats overview"]
        PG_BLDG["BuildingsPage.jsx\nTable + status filter\n(DRAFT · HIDDEN · VISIBLE)"]
        PG_EDIT["BuildingEditorPage.jsx\nFull CRUD + 3D model upload\nDual department selectors\nPublish status control"]
        PG_DEPT["DepartmentsPage.jsx\nCollege CRUD\nMap pin color picker"]
        PG_GEO["GeofencesPage.jsx\nMapbox map\nClick-to-place center marker\nRadius circle overlay"]
        PG_PANO["PanoramasPage.jsx\nBuilding list view"]
        PG_PANO_M["PanoramaManagerPage.jsx\n3-column layout:\nScenes · Preview · Hotspots\nyaw / pitch coordinate inputs"]
        PG_MEDIA["MediaPage.jsx\n3D model + asset file upload\nCloudinary integration"]
        PG_QUESTS["QuestsPage.jsx\nCreate / edit quests per building\nreward_points auto-fill"]
        PG_TRIVIA["TriviaPage.jsx\nBuilding trivia CRUD"]
        PG_PROF["ProfessionalsPage.jsx\nCreate professional accounts\nbypasses OTP flow"]
        PG_USERS["UserManagement.jsx\nView all users + roles"]
        PG_LEAD["LeaderboardPage.jsx\nStudent rankings view"]
        PG_ARCH["ArchivePage.jsx\nSoft-deleted buildings\nRestore · Hard Delete actions"]
        PG_SET["SettingsPage.jsx\nCMS toggles:\nmaintenance_mode\nenable_gps · enable_qr\nenable_trivia · enable_accreditation\ndefault_quest_reward"]
    end

    subgraph API_CALLS ["API Surface Used"]
        AC1["/api/buildings/  (CRUD)"]
        AC2["/api/buildings/departments/"]
        AC3["/api/buildings/{id}/geofence/"]
        AC4["/api/panorama/scenes/  +  hotspots/"]
        AC5["/api/buildings/quests/  +  trivias/"]
        AC6["/api/auth/users/professional/"]
        AC7["/api/auth/leaderboard/"]
        AC8["/api/buildings/archived/  ·  restore/  ·  hard-delete/"]
        AC9["/api/settings/"]
        AC10["/api/dashboard/"]
    end

    LOGIN_PG --> PROTECTED
    PROTECTED --> AXIOS
    PROTECTED --> SIDEBAR

    SIDEBAR --> PAGES

    PG_BLDG  --> AC1
    PG_EDIT  --> AC1
    PG_DEPT  --> AC2
    PG_GEO   --> AC3
    PG_PANO_M --> AC4
    PG_QUESTS --> AC5
    PG_TRIVIA --> AC5
    PG_PROF  --> AC6
    PG_LEAD  --> AC7
    PG_ARCH  --> AC8
    PG_SET   --> AC9
    PG_DASH  --> AC10

    AXIOS --> AC1
    AXIOS --> AC2
    AXIOS --> AC3
    AXIOS --> AC4
    AXIOS --> AC5
    AXIOS --> AC6
    AXIOS --> AC7
    AXIOS --> AC8
    AXIOS --> AC9
    AXIOS --> AC10
```

---

## Diagram 5 — Data & Storage Layer

PostgreSQL table groups, soft-delete pattern, media storage, and JWT token lifecycle.

```mermaid
graph TD
    subgraph AUTH_TABLES ["authentication app tables"]
        T_USER["USER\nid · username · email · password\nrole · email_verified\nexploration_points · avatar_id\nstreak_count · last_login_date\nis_active · is_staff · is_superuser"]
        T_OTP["EMAIL_OTP\nid · email · otp\ncreated_at · expires_at · is_used"]
        T_JWT_BL["JWT Blacklist\n(simplejwt_blacklistedtoken)\nrevoked refresh tokens"]
    end

    subgraph BLDG_TABLES ["buildings app tables"]
        T_DEPT["DEPARTMENT\nid · name · code\ncolor_hex · is_active"]
        T_BLDG["BUILDING\nid · name · slug · description\nlatitude · longitude\nstatus · is_active\nmodel_file · model_active\nqr_code_secret\ncreated_at · updated_at\ndeleted_at ← soft delete"]
        T_GEO["GEOFENCE\nid · building_id\nlatitude · longitude\nradius_meters · is_active"]
        T_UNLOCK["BUILDING_UNLOCK\nid · user_id · building_id\nsource · unlocked_at\nlast_validated_at\nUNIQUE(user, building)"]
        T_ASSET["BUILDING_ASSET\nid · building_id · asset_type\nfile · version · file_size\nchecksum · is_active"]
        T_QUEST["QUEST\nid · target_building_id\ntitle · hint · reward_points\nis_active · created_at\ndeleted_at ← soft delete"]
        T_PROG["USER_QUEST_PROGRESS\nid · user_id · quest_id\nis_completed · completed_at\nUNIQUE(user, quest)"]
        T_TRIVIA["TRIVIA_FACT\nid · building_id\nfact · is_active\ncreated_at · deleted_at ← soft delete"]
    end

    subgraph PANO_TABLES ["panorama app tables"]
        T_SCENE["PANORAMA_SCENE\nid · building_id · title\nimage · sort_order\nis_start_scene · is_active"]
        T_HOTSPOT["PANORAMA_HOTSPOT\nid · source_scene_id · target_scene_id\nlabel · yaw · pitch · is_active"]
    end

    subgraph API_TABLE ["api app table"]
        T_SETTING["SYSTEM_SETTING\nid (always=1) · app_name\nmaintenance_mode · contact_email\nenable_gps · enable_qr\nenable_ar_selfie · enable_trivia\nenable_accreditation\nenable_leaderboard\ndefault_quest_reward"]
    end

    subgraph SOFT_DELETE ["Soft Delete Pattern\n(SoftDeleteModel)"]
        SD_MGR["SoftDeleteManager\n.objects → filters deleted_at IS NULL\n.all_objects → no filter"]
        SD_RESTORE["Building.restore()\nsets deleted_at = null\ncascades to Quests + Trivia"]
        SD_CASCADE["Building.delete()\nsets deleted_at = now()\ncascades to Quests + Trivia"]
    end

    subgraph MEDIA ["Media Storage  (Django MEDIA_ROOT)"]
        MEDIA_3D["media/models/\n.glb / .gltf files\n(served by Django or CDN)"]
        MEDIA_PANO["media/panoramas/\n360° equirectangular images"]
        MEDIA_ASSETS["media/assets/\ngeneral building files"]
    end

    subgraph JWT_LIFECYCLE ["JWT Token Lifecycle"]
        JWT_LOGIN["Login → issue\naccess (60 min)\nrefresh (7 days)"]
        JWT_USE["API call → attach\nAuthorization: Bearer <access>"]
        JWT_EXPIRE["Access expired\n→ POST /token/refresh/"]
        JWT_LOGOUT["Logout\n→ blacklist refresh token"]
    end

    T_USER -->|"1 to many"| T_OTP
    T_USER -->|"1 to many"| T_UNLOCK
    T_USER -->|"1 to many"| T_PROG
    T_DEPT -->|"FK primary_department"| T_BLDG
    T_DEPT -->|"M2M departments"| T_BLDG
    T_BLDG -->|"1 to many"| T_GEO
    T_BLDG -->|"1 to many"| T_UNLOCK
    T_BLDG -->|"1 to many"| T_ASSET
    T_BLDG -->|"1 to many"| T_QUEST
    T_BLDG -->|"1 to many"| T_TRIVIA
    T_BLDG -->|"1 to many"| T_SCENE
    T_SCENE -->|"source_scene"| T_HOTSPOT
    T_SCENE -->|"target_scene"| T_HOTSPOT
    T_QUEST -->|"1 to many"| T_PROG

    T_BLDG --> SD_CASCADE
    T_BLDG --> SD_RESTORE
    SD_MGR --> T_BLDG

    T_BLDG --> MEDIA_3D
    T_ASSET --> MEDIA_ASSETS
    T_SCENE --> MEDIA_PANO

    JWT_LOGIN --> JWT_USE
    JWT_USE --> JWT_EXPIRE
    JWT_EXPIRE --> JWT_LOGIN
    JWT_LOGIN --> JWT_LOGOUT
    JWT_LOGOUT --> T_JWT_BL
```

---

## Layer Summary Table

| Layer | Technology | Language | Hosted |
|---|---|---|---|
| Mobile App | React Native · Expo | JavaScript (JSX) | Android APK via EAS |
| Backend API | Django 5 · DRF | Python | Server / VPS |
| Admin Dashboard | React 19 · Vite | JavaScript (JSX) | Static host / VPS |
| Database | PostgreSQL | SQL | Same server as backend |
| Media Storage | Django Media / S3-compatible | — | Filesystem or cloud |
| Auth | SimpleJWT · Brevo SMTP | — | Embedded in backend |

---

## System Invariants

| # | Rule |
|---|---|
| 1 | Backend is the **single source of truth** — all business logic runs server-side |
| 2 | No hardcoded campus data in the mobile application |
| 3 | Role-based access is **always** enforced at the API endpoint level |
| 4 | Heavy assets (3D / 360°) are never bundled in the app — always loaded on demand |
| 5 | All 3D and 360° rendering happens inside **WebView** (no Unity, no ARCore) |
| 6 | Geofencing tolerates GPS drift (±5m–±30m); avoids strict binary lock |
| 7 | Admin updates reflect immediately via API — no app reinstall required |

---

## Documentation

### Overview

ARQuest is a four-layer distributed system. The four layers are the Android mobile application, the Django REST API backend, the React-based admin web dashboard, and the data layer made up of PostgreSQL and a media file store. Each layer has a specific responsibility and talks to adjacent layers through authenticated REST interfaces. This separation means each layer can change independently. The mobile UI can be redesigned, the admin dashboard can grow new pages, or the database schema can be updated without needing a coordinated release across everything at once.

The core design rule is that the backend is the single source of truth. Business logic, access control, geofence decisions, and data validation all run on the server. Client applications, both mobile and web, are treated as presentation layers that submit requests and show results. They are never trusted to make decisions that affect data integrity or security.

---

### Layer 1 - Mobile Application (React Native / Expo)

The mobile application uses React Native with the Expo managed workflow and targets Android devices. Expo was chosen because it cuts down build and deployment overhead compared to bare React Native while still giving access to native device capabilities through its SDK. The specific packages used are `expo-location` for GPS tracking, `expo-camera` for the AR camera feed, `expo-secure-store` for encrypted JWT storage, and `expo-media-library` for saving AR selfie photos to the device gallery.

Navigation uses `expo-router` with file-based routing. Screens are split into two route groups: `(auth)` for unauthenticated flows like login, register, and OTP verification, and `(tabs)` for the main app shell with bottom tab navigation. Full-screen feature screens such as the 3D viewer, panorama viewer, virtual tour, and leaderboard sit at the top level of the app directory and get pushed onto the navigation stack from tab screens.

The service layer keeps all HTTP communication behind dedicated modules. `api.js` sets up an Axios instance that attaches the JWT access token from SecureStore to every request header and handles token refresh on 401 responses. Individual services like `authService.js`, `geofencingService.js`, `unlockService.js`, and `assetService.js` wrap specific API endpoint groups so screen components do not contain raw HTTP calls.

Custom hooks sit between the services and the screens. `useLocationTracking` runs a background GPS watcher and gives screens the current coordinates and accuracy. `useUnlockedBuildings` keeps a live list of buildings the current user has access to. `useAssetCache` handles local caching of 3D model URLs and panorama data to avoid re-downloading files on repeated visits. `useRoleAccess` exposes boolean flags from the current user's role for conditional rendering.

The WebView rendering layer is a deliberate boundary in the architecture. All 3D and 360 degree visualization is handed off to standalone HTML pages that run Three.js inside a React Native `WebView`. This avoids the complexity and APK size cost of integrating a native 3D engine like Unity or a full ARCore SDK. Three.js handles interactive GLB model viewing, panoramic projection, and gyroscope-based virtual tours while staying within the JavaScript ecosystem. The WebView and React Native communicate through `postMessage` events in both directions. The native layer can tell the renderer to load a scene or change a model. The renderer can notify the native layer when loading is done, when a hotspot is tapped, or when an error occurs.

---

### Layer 2 - Backend API (Django 5 + Django REST Framework)

The backend is a Django 5 application using Django REST Framework to serve a JSON API. It is split into five Django applications, each with a separate domain responsibility.

The `authentication` app handles everything related to user identity: registration, OTP email verification, login, logout, JWT token issuance and refresh, role-based permission classes, and professional account creation. It uses SimpleJWT with access tokens set to 60 minutes and refresh tokens set to 7 days. Refresh tokens are blacklisted on logout so they cannot be reused after a session ends. Outbound email goes through the `django-anymail` library using Brevo SMTP.

The `buildings` app is the largest domain. It covers CRUD for buildings and departments, geofence setup, building unlock tracking, asset metadata, quest and trivia content, and the soft-delete archive system. The `SoftDeleteModel` abstract base class, used by `Building`, `Quest`, and `TriviaFact`, overrides Django's default `delete()` to write a `deleted_at` timestamp instead of running a SQL DELETE. A `SoftDeleteManager` filters those records out of all standard querysets so archived content is invisible to normal queries but still reachable through the archive management endpoints.

The `geofencing` app has no models. It provides one stateless POST endpoint that takes GPS coordinates and accuracy from the mobile app, queries active geofences from the buildings domain, and runs a Haversine calculation for each. The response includes a status label (inside, nearby, outside, or weak signal) and the distance to the nearest building. Keeping this logic in its own app means the detection algorithm can be changed without touching the building data management code.

The `panorama` app manages the two models that power 360 degree walkthroughs: `PanoramaScene` for individual panorama images and `PanoramaHotspot` for navigation links between scenes. Admin endpoints provide full CRUD on scenes and hotspots. Mobile endpoints return the full walkthrough graph for a building in a single response to keep round trips low during viewer startup.

The `api` app provides system-wide utility endpoints that do not fit other domains: a health check, a dashboard stats summary for the admin homepage, and the `SystemSetting` singleton with a public read endpoint for mobile and an authenticated write endpoint for admin.

All API endpoints use custom DRF permission classes for role-based access: `IsAdminRole`, `IsStudentRole`, `IsProfessionalRole`, `IsAdminOrProfessionalRole`, and `IsAuthenticatedWithRole`. These classes read the `role` field from the authenticated user object, which is parsed from the JWT token on every request. If the role does not match, the endpoint returns 403 Forbidden. Access control is always evaluated on the server regardless of what the client UI shows.

---

### Layer 3 - Admin Web Dashboard (React 19 + Vite)

The admin web dashboard is a single-page application built with React 19 and Vite. It gives administrators a content management interface for all campus data without requiring direct database access or code changes. It is kept separate from the mobile application so it is not constrained by small screen sizes, touch interaction patterns, or app store distribution requirements.

The dashboard authenticates with the same JWT tokens as the mobile app but stores them in `localStorage` instead of a hardware enclave. This is appropriate for a browser-based tool on trusted administrator machines. An Axios instance with request and response interceptors handles token attachment and automatic refresh on 401 errors, matching the mobile app's token behavior.

The navigation is a persistent left sidebar covering all functional areas: Buildings, Departments, Geofences, Panoramas, Media, Quests, Trivia, Professional Accounts, User Management, Leaderboard, Archive, and Settings. Each section maps to a specific part of the backend API.

The geofence editor is the most complex component. It embeds a Mapbox map restricted to the WMSU campus bounding box. Clicking the map places the geofence center marker and the radius circle updates live as the radius input changes. This gives immediate visual feedback on coverage area before saving, which reduces the chance of geofences being set too large or too small.

The Panorama Manager uses a three-column layout with the scene list on the left, scene image preview in the center, and hotspot management on the right. Hotspot positioning uses yaw and pitch angles in degrees, matching the spherical coordinate values Three.js uses to place hotspot markers in the panorama viewer.

---

### Layer 4 - Data Layer (PostgreSQL and Media Storage)

PostgreSQL is the relational database for all structured data. It was chosen for its relational integrity support, JSON field capability for future flexibility, and compatibility with Django's ORM. The database is only accessed through the Django ORM. No component issues raw SQL or connects directly to the database outside the backend process.

Media files including 3D models, panorama images, and building assets are stored separately from the database in a Django-managed media directory. In development this is a local filesystem path. In production it can be swapped out for an S3-compatible object store without changing application code, because all file access goes through Django's `FileField` and `ImageField` storage backends. Files are served either directly by Django in development or through a CDN or reverse proxy in production. The mobile app never bundles these files. They are always fetched on demand from URLs in API responses and cached locally by the asset cache layer.

---

### Cross-Cutting Concerns

**Security** is handled through JWT authentication on all non-public endpoints, server-side role checks on every API call, CORS configuration restricting API access to trusted origins, and OTP email verification to block fake account creation. The `qr_code_secret` UUID on each building prevents building unlock bypass through URL guessing.

**Performance** is managed through client-side asset caching to avoid re-downloading models, GPS polling throttling to reduce battery drain, lazy loading of WebView renderers so Three.js only loads when the user navigates to the 3D viewer, and a client-side Haversine pre-filter to cut the number of server-side validation requests.

**Maintainability** comes from separating domains into independent Django apps, using serializers as an explicit contract between the database and the API, and the context-file documentation system that keeps architectural decisions written down alongside the code.

**Scalability** is currently vertical. The backend scales by adding server resources. There are no obstacles to horizontal scaling in the future because all session state lives in JWT tokens on the client side or in the shared PostgreSQL database.
