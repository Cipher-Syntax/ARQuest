# ARQuest — User Flow

> Last updated: 2026-09-01
> Covers all four user roles: Student, Professional (Accreditor), Admin, and Visitor.

---

## Flow 1 — App Entry, Legal Onboarding & Role Routing

```mermaid
flowchart TD
    OPEN["Open ARQuest App"]
    CHECK["Check stored JWT token"]

    OPEN --> CHECK

    CHECK -->|"Token valid"| RESTORE["Restore session\nLoad user role + profile"]
    CHECK -->|"No token / expired"| GATE["Authentication Gateway"]

    GATE --> LOGIN["Login Screen"]
    GATE --> REGISTER["Register Screen\n(Student only)"]
    GATE --> VISITOR["Continue as Visitor\n(Guest access)"]

    LOGIN -->|"Active Student"| STUDENT_HOME["Student Home\n(Quest Arena)"]
    LOGIN -->|"Active Professional"| PROF_HOME["Professional Home\n(Evaluation Portal)"]
    LOGIN -->|"Active Admin"| ADMIN_HOME["Admin Web Dashboard\n(Separate Web App)"]
    
    LOGIN -->|"Deactivated Account (is_active=False)"| DEACT_MODAL["Account Deactivated Modal\n+ Inline Amber Banner"]
    DEACT_MODAL -->|"Tap 'Reactivate & Log In'"| REACTIVATE["Reactivate API Call\n(reactivate=true)"]
    REACTIVATE -->|"Restore Account"| RESTORE

    REGISTER --> ONBOARDING_LEGAL["Mandatory Terms & Privacy Agreement\n(Unchecked Checkbox Lock)"]
    ONBOARDING_LEGAL --> OTP["OTP Verification Screen\n(6-digit email code)"]
    OTP --> AVATAR["Avatar Selection Screen\n(Choose WMSU Character)"]
    AVATAR --> STUDENT_HOME

    VISITOR --> VISITOR_HOME["Visitor Home\n(Public Campus Map)"]

    RESTORE -->|"student"| STUDENT_HOME
    RESTORE -->|"professional"| PROF_HOME
    RESTORE -->|"visitor"| VISITOR_HOME
```

---

## Flow 2 — Student: Exploration & Native Spatial AR Navigation

```mermaid
flowchart TD
    HOME["Home Tab\nActive Quests + Daily Streak"]

    HOME --> EXPLORE["Explore Tab\nMapbox Campus Map"]
    EXPLORE --> SELECT["Select Target Building Pin"]
    SELECT --> NAV_CHOICE{"Choose Navigation Mode"}

    NAV_CHOICE -->|"2D Visual Route"| MAP_ROUTE["Fetch Custom WMSU Walkway Route\n(GET /api/navigation/route/)\nA* Shortest-Path Calculation\nDraw GeoJSON Path on Map (Electric Cyan)"]
    NAV_CHOICE -->|"Spatial AR Lens"| AR_SCREEN["Launch Spatial AR (ViroReact)"]

    AR_SCREEN --> SENSORS["Read GPS Coords + Compass Heading (Azimuth)"]
    SENSORS --> SMOOTHING["Apply EMA Smoothing & FOV Math"]

    SMOOTHING --> FOV_CHECK{"Destination in Camera FOV?"}
    FOV_CHECK -->|"Yes (Within 45°)"| CHEVRONS["Project Glowing 3D Ground Chevrons\n+ Floating Tactical Distance HUD"]
    FOV_CHECK -->|"No (Off-Screen)"| HUD_ARROW["Display 2D Turn Indicator\n(◀ TURN LEFT / TURN RIGHT ▶)"]

    CHEVRONS --> WALK["Follow Ground Arrows to Destination"]
    HUD_ARROW --> WALK

    WALK --> GEOFENCE{"Inside Geofence Boundary?"}
    GEOFENCE -->|"Yes"| UNLOCK["Building Unlocked!\n+25 EXP Awarded + Stamp in Passport"]
    UNLOCK --> OPTIONS{"Explore Options"}

    OPTIONS --> VIEW_3D["First-Person 3D Virtual Tour (Three.js)"]
    OPTIONS --> VIEW_PANO["360° Photo Sphere Walkthrough"]
    OPTIONS --> QUIZ["Take Building Trivia Quiz (+50 EXP)"]

    VIEW_3D <-->|"Hybrid Spatial Linking (Unit 30)\n3D Doorway Portals / Proximity HUD"| VIEW_PANO
```

---

## Flow 3 — Professional (Accreditor): Remote Evaluation & VR

```mermaid
flowchart TD
    PROF_LOGIN["Log in as Professional / Accreditor"]
    PROF_LOGIN --> PROF_PORTAL["Accreditor Evaluation Portal\n(All Buildings Unlocked Default)"]

    PROF_PORTAL --> DIRECTORY["Browse Campus Facilities Directory"]
    DIRECTORY --> SELECT_BLDG["Select Facility (e.g. College of Science)"]

    SELECT_BLDG --> EVAL_CHOICE{"Choose Inspection Mode"}

    EVAL_CHOICE -->|"360° Virtual Tour"| PANO_VIEW["360° Panoramic Indoor Walkthrough"]
    EVAL_CHOICE -->|"3D Model Inspection"| MODEL_VIEW["Interactive 3D Architectural Model"]
    EVAL_CHOICE -->|"Visited Checklist"| CHECKLIST["Mark Facility as Evaluated in Passport"]

    PANO_VIEW --> HOTSPOTS["Navigate Room-to-Room via Hotspots\n(Entrance → Hallway → Labs)"]
    PANO_VIEW --> VR_TOGGLE["Enable 'Magic Window VR' Mode"]
    VR_TOGGLE --> GYRO["Look around using Phone Gyroscope\n(First-Person Inspection)"]

    MODEL_VIEW <-->|"Direct Room Jump\n(Spatial Linking)"| PANO_VIEW
```

---

## Flow 4 — Account Settings, Password Management & Deactivation

```mermaid
flowchart TD
    PROFILE["Profile Tab → Account Settings"]

    PROFILE --> SETTINGS_MENU{"Select Action"}

    SETTINGS_MENU -->|"Change Avatar"| AVATAR_MODAL["Avatar Gallery Picker\n(PATCH /api/auth/me/)"]
    SETTINGS_MENU -->|"Edit Name"| NAME_MODAL["Edit First & Last Name\n(PATCH /api/auth/me/)"]
    SETTINGS_MENU -->|"Change Password"| PWD_MODAL["Change Password Modal\n(Old Pass + New Pass + Confirm)"]
    SETTINGS_MENU -->|"Deactivate Account"| DEACT_MODAL["Deactivate Account Modal\n(Warning Callout + Password Confirm)"]

    PWD_MODAL --> PWD_SUBMIT["POST /api/auth/change-password/"]
    PWD_SUBMIT -->|"Success"| PWD_OK["Password Updated Alert"]

    DEACT_MODAL --> DEACT_SUBMIT["POST /api/auth/deactivate/"]
    DEACT_SUBMIT -->|"Success"| DEACT_LOGOUT["Tokens Cleared & User Logged Out\n(Data Preserved in DB)"]
    DEACT_LOGOUT --> LOGIN_SCR["Redirected to Login Screen"]
```

---

## Flow 5 — App Preferences & Audio Control

```mermaid
flowchart TD
    PROFILE["Profile Tab → App Preferences"]

    PROFILE --> PREF_SECTION{"Configure Settings"}

    PREF_SECTION -->|"Audio & Haptics"| SFX_TOGGLE["Toggle Sound Effects (SFX)\n(Mute/Unmute SoundManager)"]
    PREF_SECTION -->|"Haptic Vibration"| HAP_TOGGLE["Toggle Haptic Touch Vibrations"]
    PREF_SECTION -->|"Notifications"| PUSH_TOGGLE["Toggle Push & Streak Alerts"]
    PREF_SECTION -->|"Distance Unit"| UNIT_TOGGLE["Switch between Meters (m) and Feet (ft)"]
    PREF_SECTION -->|"Compass Map"| COMPASS_TOGGLE["Toggle Auto-Rotation with Device Heading"]
    PREF_SECTION -->|"Storage & Cache"| CLEAR_CACHE["Clear 3D Models & Temp Cache"]

    SFX_TOGGLE --> SYNC_ASYNC["Persist Preferences in AsyncStorage"]
    HAP_TOGGLE --> SYNC_ASYNC
    PUSH_TOGGLE --> SYNC_ASYNC
    UNIT_TOGGLE --> SYNC_ASYNC
    COMPASS_TOGGLE --> SYNC_ASYNC
    CLEAR_CACHE --> SYNC_ASYNC
```

---

## Flow 6 — Mobile Feedback & Issue Reporting

```mermaid
flowchart TD
    USER_ACTION["Profile Tab → Report Issue / Feedback"]
    USER_ACTION --> MODAL["Open FeedbackModal"]

    MODAL --> SELECT_TYPE["Select Category\n(🐛 Bug Report | 💡 Feature Request | 💬 Feedback)"]
    SELECT_TYPE --> INPUT_DESC["Enter Description & Details"]
    INPUT_DESC --> SUBMIT["Tap 'Submit Feedback' (POST /api/feedback/)"]

    SUBMIT --> DB_NOTIF["Database: Feedback saved + Admin Notification created"]
    DB_NOTIF --> USER_ALERT["Display 'Thank You for Feedback' Confirmation"]

    DB_NOTIF --> ADMIN_RADAR["Admin Web Dashboard: Real-Time Feedback Radar Updated"]
    ADMIN_RADAR --> ADMIN_RESOLVE["Admin Reviews Issue → Updates Status to 'Resolved'"]
```

---

## Flow 7 — Admin Walking Network Authoring & Disconnected Way Pruning

```mermaid
flowchart TD
    ADMIN_START["Admin Dashboard → Navigate to 'Walking Paths' (NavigationPage)"]
    ADMIN_START --> MAP_VIEW["Interactive Satellite Map with Walking Path Overlays"]

    MAP_VIEW --> ADMIN_CHOICE{"Admin Authoring Action"}

    ADMIN_CHOICE -->|"Add / Edit Node"| PLACE_NODE["Click Map Coordinates → Select Type\n(Entrance, Walkway, Gate, POI)\nAnchor Building / Accessibility Flag"]
    ADMIN_CHOICE -->|"Draw Path"| DRAW_WAY["Select Origin Node → Plot Intermediate Polyline Coordinates → Select Destination Node\n(Calculate Geodesy Distance)"]
    ADMIN_CHOICE -->|"Delete Node"| DELETE_NODE["Admin Deletes Junction or POI Node"]

    PLACE_NODE --> BULK_SAVE["Save to Backend (POST/PUT /api/navigation/nodes/)"]
    DRAW_WAY --> BULK_SAVE_PATH["Save to Backend (POST/PUT /api/navigation/paths/)"]
    DELETE_NODE --> REALTIME_PRUNE["Real-Time Way Pruning:\nClient automatically purges disconnected paths referencing deleted node"]
    REALTIME_PRUNE --> BULK_DELETE["Delete Cascaded Paths & Node in Database (DELETE /api/navigation/nodes/:id/)"]

    BULK_SAVE --> GRAPH_READY["Campus Graph Updated in Database"]
    BULK_SAVE_PATH --> GRAPH_READY
    BULK_DELETE --> GRAPH_READY

    GRAPH_READY --> SERVER_ASTAR["Backend A* Pathfinder Serves Zero-Downtime Clean Topological Routes"]
```
