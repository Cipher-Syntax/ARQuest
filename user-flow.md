# ARQuest — User Flow

> Last updated: 2026-06-20
> Covers all four user roles: Student, Professional (Accreditor), Admin, and Visitor.

---

## Flow 1 - App Entry and Role Routing

The first decision every user hits when opening the app.

```mermaid
flowchart TD
    OPEN["Open ARQuest App"]
    CHECK["Check stored JWT token"]

    OPEN --> CHECK

    CHECK -->|"Token valid"| RESTORE["Restore session\nLoad user role + profile"]
    CHECK -->|"No token / expired"| GATE["Authentication Gateway"]

    GATE --> LOGIN["Login Screen"]
    GATE --> REGISTER["Register Screen\n(Student only)"]
    GATE --> VISITOR["Continue as Visitor\n(read-only access)"]

    LOGIN -->|"Admin credentials"| ADMIN_HOME["Admin Web Dashboard\n(separate web app)"]
    LOGIN -->|"Student credentials"| STUDENT_HOME["Student Home\nQuest Dashboard"]
    LOGIN -->|"Professional credentials"| PROF_HOME["Professional Home\nBuildings List"]
    VISITOR --> VISITOR_HOME["Visitor Home\nCampus Overview"]

    REGISTER --> OTP["OTP Verification Screen\n(6-digit email code)"]
    REGISTER --> AVATAR["Avatar Selection Screen\n(Choose WMSU character)"]
    AVATAR --> OTP
    OTP -->|"Code correct"| STUDENT_HOME
    OTP -->|"Code wrong / expired"| RESEND["Resend OTP"]
    RESEND --> OTP

    RESTORE -->|"student"| STUDENT_HOME
    RESTORE -->|"professional"| PROF_HOME
    RESTORE -->|"visitor"| VISITOR_HOME
```

---

## Flow 2 - Student: Full Exploration Flow

The main journey for a student from opening the app to completing a quest.

```mermaid
flowchart TD
    HOME["Home Tab\nActive quest + exploration points"]

    HOME --> EXPLORE["Explore Tab\nCampus map + GPS tracking"]

    EXPLORE --> GPS_START["Tap Start GPS Tracking"]
    GPS_START --> TRACKING["GPS Tracking Active\nLocation updates every 5s"]

    TRACKING --> GEO_CHECK{"Geofence status?"}

    GEO_CHECK -->|"outside"| WALK["Walk around campus\nMap shows building pins"]
    WALK --> GEO_CHECK

    GEO_CHECK -->|"weak signal"| WEAK["Show weak GPS warning\nContinue tracking"]
    WEAK --> GEO_CHECK

    GEO_CHECK -->|"nearby"| NEARBY["Show 'Nearby' badge\n+ distance to building"]
    NEARBY --> GEO_CHECK

    GEO_CHECK -->|"inside"| INSIDE["Building detected!\nAuto-unlock triggered"]
    INSIDE --> UNLOCK["BuildingUnlock record created\n(source: geofence)"]
    UNLOCK --> NOTIF["Show unlocked notification\non Explore tab"]

    NOTIF --> NEXT{"What to do next?"}

    NEXT --> VIEW_3D["Go to Buildings Tab\nTap View 3D Model"]
    NEXT --> VIEW_AR["Go to AR Tab\nAR camera overlay"]
    NEXT --> EXPLORE

    VIEW_3D --> VIEWER_3D["Building3DViewer\nRotate and zoom 3D model"]
    VIEW_AR --> AR_SCREEN["AR Screen\nCamera + 3D overlay + labels"]
```

---

## Flow 3 - Student: AR Camera and Quest Completion

What happens inside the AR view when a student is physically inside a building zone.

```mermaid
flowchart TD
    AR["AR Tab\n(Camera permission required)"]

    AR --> PERM{"Camera\npermission?"}
    PERM -->|"denied"| GRANT["Show Grant Permission button"]
    GRANT --> PERM
    PERM -->|"granted"| CAM["Live camera feed active"]

    CAM --> DETECT{"Nearby unlocked\nbuilding?"}

    DETECT -->|"No"| IDLE["Show idle AR screen\n'No building detected nearby'"]
    IDLE --> DETECT

    DETECT -->|"Yes"| OVERLAY["Show 3D model overlay\n(auto-rotating on camera feed)"]
    OVERLAY --> LABEL["Show building name label\n+ geofence status badge"]
    LABEL --> QUEST_BTN["Show Claim Points button\n(if active quest exists)"]

    QUEST_BTN --> CLAIM["Tap Claim Points"]
    CLAIM --> QUEST_API["POST /api/gamification/quests/{id}/complete/"]
    QUEST_API --> TRIVIA_MODAL["Trivia Modal appears\nFact + points earned displayed"]
    TRIVIA_MODAL --> POINTS["exploration_points updated\non user profile"]

    LABEL --> SELFIE_BTN["Tap Take AR Selfie"]
    SELFIE_BTN --> CAPTURE["Composite capture:\ncamera + 3D overlay + branded frame"]
    CAPTURE --> SAVED["Photo saved to device gallery"]

    POINTS --> HOME_UPDATE["Home tab shows\nupdated quest progress"]
```

---

## Flow 4 - Student: 360 Degree Panorama Walkthrough

A student navigates a building's virtual walkthrough from the Buildings tab.

```mermaid
flowchart TD
    BLDG_TAB["Buildings Tab\nList of unlocked buildings"]

    BLDG_TAB --> SELECT["Select a building"]
    SELECT --> DETAIL["Building detail card\n3D Model button + 360 Walkthrough button"]

    DETAIL --> BTN_PANO["Tap 360 Walkthrough"]
    BTN_PANO --> FETCH["Fetch panorama data\nGET /api/buildings/{id}/panorama/"]
    FETCH --> VIEWER["PanoramaViewer opens\n(fullscreen WebView)"]
    VIEWER --> START["Start scene loaded\n360 image rendered as sphere"]

    START --> INTERACT{"User interaction"}

    INTERACT -->|"Drag to pan"| PAN["Camera rotates\naround panorama sphere"]
    PAN --> INTERACT

    INTERACT -->|"Tap hotspot marker"| NAV["Navigate to linked scene\nnew panorama image loaded"]
    NAV --> INTERACT

    INTERACT -->|"Tap back button"| BACK["Return to Buildings Tab"]
```

---

## Flow 5 - Student: Leaderboard and Rankings

How a student checks their standing and sees others' progress.

```mermaid
flowchart TD
    PROFILE["Profile Tab\nUser stats + settings"]

    PROFILE --> POINTS_DISPLAY["Shows total exploration_points\nand completed quests count"]
    PROFILE --> LEAD_BTN["Tap View Leaderboard"]
    LEAD_BTN --> LEADERBOARD["Leaderboard Screen\nGold / Silver / Bronze podiums"]

    LEADERBOARD --> TOP3["Top 3 students displayed\nwith podium styling"]
    LEADERBOARD --> FULL_LIST["Full ranked list below\nshows rank + points per student"]
    LEADERBOARD --> ACTIVITY["Recent Activity Feed\nGlobal quest completions"]

    TOP3 --> BACK_PROF["Tap back\nReturn to Profile"]
    FULL_LIST --> BACK_PROF
    ACTIVITY --> BACK_PROF
```

---

## Flow 6 - Professional: Building Access and Virtual Tour

Professionals bypass geofencing and access all buildings directly for evaluation.

```mermaid
flowchart TD
    PROF_HOME["Professional Home\nAll buildings visible\n(no geofence required)"]

    PROF_HOME --> BLDG_LIST["Buildings Tab\nAll active buildings listed\n(role_access unlock auto-applied)"]

    BLDG_LIST --> SELECT["Select any building"]
    SELECT --> DETAIL["Building detail card"]

    DETAIL --> OPT1["Tap 360 Walkthrough"]
    DETAIL --> OPT2["Tap Virtual Tour\n(Magic Window VR)"]
    DETAIL --> OPT3["Tap View 3D Model"]

    OPT1 --> PANO_VIEW["PanoramaViewer\nHotspot navigation\n(same as student flow)"]

    OPT2 --> VT_VIEW["VirtualTourViewer\nLandscape fullscreen\nGyroscope first-person camera\nRotate device to look around"]

    OPT3 --> VIEWER_3D["Building3DViewer\nInteractive 3D model\nOrbitControls touch gestures"]

    PANO_VIEW --> BACK["Return to Buildings List"]
    VT_VIEW --> BACK
    VIEWER_3D --> BACK
```

---

## Flow 7 - Visitor: Limited Campus Overview

Visitors have read-only access to published building information without any unlocking mechanism.

```mermaid
flowchart TD
    VISITOR_ENTRY["Continue as Visitor\n(no account required)"]

    VISITOR_ENTRY --> VISITOR_HOME["Visitor Home\nCampus overview + map"]

    VISITOR_HOME --> EXPLORE_MAP["Explore Tab\nSee campus map with building pins"]
    VISITOR_HOME --> BLDG_BROWSE["Buildings Tab\nBrowse visible building info"]

    EXPLORE_MAP --> VIEW_PIN["Tap building pin\nSee basic building name and location"]
    BLDG_BROWSE --> VIEW_INFO["See building name, description,\ndepartment info"]

    VIEW_PIN --> BLOCKED{"Try to unlock?"}
    BLOCKED -->|"Visitor cannot unlock"| PROMPT["Prompt: Register or Login\nto access full features"]

    VIEW_INFO --> BLOCKED2{"Try to view 3D / 360?"}
    BLOCKED2 -->|"Visitor cannot access"| PROMPT2["Prompt: Register or Login\nto access 3D and walkthroughs"]

    PROMPT --> LOGIN_LINK["Go to Login Screen"]
    PROMPT2 --> LOGIN_LINK
    LOGIN_LINK --> REGISTER_LINK["Go to Register Screen"]
```

---

## Flow 8 - Admin: Building Creation and Publishing

The full admin workflow for creating a building from scratch to live on the mobile app.

```mermaid
flowchart TD
    DASH["Admin Dashboard\nOverview stats"]

    DASH --> BLDG_PAGE["Buildings Page\nTable of all buildings"]
    BLDG_PAGE --> CREATE["Click Create Building"]

    CREATE --> FORM["Building Editor Form"]
    FORM --> SAVE_DRAFT["Save as DRAFT\n(no coordinates needed yet)"]

    SAVE_DRAFT --> UPLOAD_3D["Upload 3D Model\n.glb / .gltf file"]
    UPLOAD_3D --> DEPT_SET["Set Primary Department\n(for map pin color)"]
    DEPT_SET --> ASSOC_DEPT["Set Associated Departments\n(optional multi-select)"]

    ASSOC_DEPT --> SET_GEO["Open Geofences Page\nClick on map to place center\nAdjust radius in meters"]
    SET_GEO --> GEO_SAVED["Geofence saved\nRadius circle visible on map"]

    GEO_SAVED --> PANO_UPLOAD["Open Panorama Manager\nUpload 360 scenes\nSet start scene\nAdd hotspots with yaw/pitch"]

    PANO_UPLOAD --> QUEST_CREATE["Open Quests Page\nCreate quest for this building\nSet reward_points + hint"]

    QUEST_CREATE --> QUIZ_CREATE["Open Quizzes Page\nCreate quizzes for this building"]
    QUIZ_CREATE --> TRIVIA_CREATE["Open Trivia Page\nAdd trivia facts for this building"]

    TRIVIA_CREATE --> PUBLISH["Return to Building Editor\nSet status to VISIBLE"]
    PUBLISH --> VALIDATE["Backend validates:\n- slug present\n- lat/lng present"]

    VALIDATE -->|"validation fails"| FIX["Fix missing fields\nRe-submit"]
    FIX --> VALIDATE

    VALIDATE -->|"validation passes"| LIVE["Building is LIVE\nAppears on mobile app immediately"]
```

---

## Flow 9 - Admin: Managing Professionals

How an admin creates and manages professional (accreditor) accounts.

```mermaid
flowchart TD
    SIDEBAR["Admin Sidebar\nClick Professional Accounts"]

    SIDEBAR --> PROF_PAGE["Professionals Page\nList of existing professional accounts"]

    PROF_PAGE --> CREATE_BTN["Click Create Professional"]
    CREATE_BTN --> MODAL["Create Professional Modal\nEnter: username, email, password,\nfirst_name, last_name"]

    MODAL --> SUBMIT["Submit form"]
    SUBMIT --> API["POST /api/auth/users/professional/\n(admin only, skips OTP flow)"]
    API --> CREATED["Professional account created\nrole=professional\nemail_verified=true automatically"]

    CREATED --> LIST_UPDATE["Account appears in list\nProfessional can log in immediately"]

    PROF_PAGE --> MANAGE["Manage existing accounts\nView user list"]
```

---

## Flow 10 - Admin: Archive and Restore Buildings

How admins safely remove and recover building content.

```mermaid
flowchart TD
    BLDG_PAGE["Buildings Page\nAll live buildings listed"]

    BLDG_PAGE --> SELECT["Select a building"]
    SELECT --> EDITOR["Building Editor"]
    EDITOR --> ARCHIVE_BTN["Click Move to Archive"]

    ARCHIVE_BTN --> CONFIRM["Confirmation dialog"]
    CONFIRM -->|"Cancel"| EDITOR
    CONFIRM -->|"Confirm"| SOFT_DEL["Backend sets deleted_at = now()\nBuilding hidden from mobile app\nQuests + Trivia also archived"]

    SOFT_DEL --> GONE["Building no longer visible\non mobile or in live building list"]

    GONE --> ARCH_PAGE["Admin: Open Archive Page\nLists all soft-deleted buildings"]

    ARCH_PAGE --> RESTORE_BTN["Click Restore"]
    RESTORE_BTN --> RESTORED["deleted_at cleared\nBuilding live again\nQuests + Trivia restored"]

    ARCH_PAGE --> HARD_BTN["Click Hard Delete"]
    HARD_BTN --> CONFIRM2["Confirmation dialog\n(permanent - cannot undo)"]
    CONFIRM2 -->|"Confirm"| PERM_DEL["Permanent SQL DELETE\nAll related data removed"]
    CONFIRM2 -->|"Cancel"| ARCH_PAGE
```

---

## Flow 11 - Admin: System Settings and Feature Toggles

How an admin controls global system behavior from the CMS settings page.

```mermaid
flowchart TD
    CMS_PAGE["CMS / Settings Page"]

    CMS_PAGE --> MAINT["Toggle maintenance_mode"]
    MAINT -->|"ON"| MAINT_ON["All non-admin API requests blocked\nMobile shows maintenance banner"]
    MAINT -->|"OFF"| MAINT_OFF["System returns to normal operation"]

    CMS_PAGE --> FEAT["Feature Toggles"]
    FEAT --> GPS_TOG["enable_gps\nOFF hides GPS tracking on mobile"]
    FEAT --> QR_TOG["enable_qr\nOFF hides QR scanner in AR view"]
    FEAT --> AR_TOG["enable_ar_selfie\nOFF hides selfie capture button"]
    FEAT --> TRIVIA_TOG["enable_trivia\nOFF hides trivia modal after quest"]
    FEAT --> ACCRED_TOG["enable_accreditation\nOFF hides professional-only features"]
    FEAT --> LEAD_TOG["enable_leaderboard\nOFF hides leaderboard from students"]

    CMS_PAGE --> REWARD["Set default_quest_reward\nAuto-fills reward points for new quests"]

    MAINT_ON --> SAVE["PATCH /api/settings/\nChanges take effect immediately"]
    MAINT_OFF --> SAVE
    GPS_TOG --> SAVE
    QR_TOG --> SAVE
    AR_TOG --> SAVE
    TRIVIA_TOG --> SAVE
    ACCRED_TOG --> SAVE
    LEAD_TOG --> SAVE
    REWARD --> SAVE
```

---

## Flow 12 - Admin: History & Logs

How an admin reviews system notifications and feedback logs.

```mermaid
flowchart TD
    SIDEBAR["Admin Sidebar\nClick History & Logs"]

    SIDEBAR --> HISTORY_PAGE["History & Logs Page\nList of all system notifications"]

    HISTORY_PAGE --> FILTER["Filter by Category\n(System, Professional, Building, Feedback)"]
    HISTORY_PAGE --> SORT["Sort by Date\n(Newest/Oldest)"]
    
    FILTER --> VIEW_NOTIF["View Paginated List\n(5 items per page)"]
    SORT --> VIEW_NOTIF
    
    VIEW_NOTIF --> ACTION_READ["Click 'Mark as Read'"]
    ACTION_READ --> UPDATED["Notification dim\nStatus updated in DB"]
```

---

## Role Access Summary

| Feature | Student | Professional | Visitor | Admin |
|---|---|---|---|---|
| Register / Login | Yes | Admin-created | No account | Yes |
| GPS tracking | Yes | Yes | No | No |
| Geofence unlock | Yes | Auto (role) | No | No |
| QR unlock | Yes | Yes | No | No |
| View 3D model | Yes (unlocked only) | Yes (all) | No | Yes |
| 360 walkthrough | Yes (unlocked only) | Yes (all) | No | Yes |
| Magic Window VR tour | No | Yes | No | No |
| AR camera overlay | Yes | Yes | No | No |
| Quest completion | Yes | No | No | No |
| Trivia modal | Yes | No | No | No |
| Take quizzes | Yes | No | No | No |
| AR selfie | Yes | Yes | No | No |
| Leaderboard | Yes | No | No | View only |
| Browse buildings (info) | Yes | Yes | Yes (limited) | Yes |
| Create / edit buildings | No | No | No | Yes |
| Manage geofences | No | No | No | Yes |
| Upload 3D / panorama | No | No | No | Yes |
| Create quests / quizzes / trivia | No | No | No | Yes |
| Manage professionals | No | No | No | Yes |
| Archive / restore | No | No | No | Yes |
| System settings | No | No | No | Yes |
| History & Logs | No | No | No | Yes |

---

## Documentation

### Overview

The user flow diagrams in this document map out what each type of user can do inside ARQuest and the exact steps they go through to complete each action. Unlike the data-flow diagrams which show how the system processes requests internally, these diagrams focus on the user's perspective: what they see, what they tap, and where they end up. There are four user roles in the system: Student, Professional (Accreditor), Visitor, and Admin. Each role has a different scope of access and a different set of goals when using the application.

---

### Flow 1 - App Entry and Role Routing

Every user starts at the same point: opening the app. The system immediately checks whether a valid JWT token is stored in SecureStore. If a valid token exists, the user's session is restored and they are routed to the correct home screen based on their role. If no token exists or it has expired, the user lands on the authentication gateway.

From the gateway, students can log in or register a new account. Professionals log in using credentials created by an admin. Visitors skip authentication entirely and get read-only access to the campus overview. This entry point is the primary role-routing junction in the entire application.

---

### Flow 2 - Student: Full Exploration Flow

The student exploration flow is built around physical presence on campus. A student opens the Explore tab and starts GPS tracking. The app polls location updates every five seconds and checks them against all campus geofences. The map shows building pins so the student knows where to walk.

When the student enters a geofence, the app automatically sends a building unlock request to the backend. The student does not need to tap anything for the unlock to happen. After the unlock is confirmed, the student can choose between opening the 3D viewer, going to the AR camera view, or continuing to explore the map.

---

### Flow 3 - Student: AR Camera and Quest Completion

The AR camera view is where the gamification and exploration features converge. When a student opens the AR tab and is physically inside a building's geofence, the screen shows the live camera feed with a 3D model of the building overlaid on top. A building name label and status badge appear in the overlay.

If the building has an active quest, a Claim Points button appears. Tapping it sends a quest completion request to the backend. The backend returns the reward points and a random trivia fact for that building. The trivia modal shows both pieces of information before dismissing. The student's exploration points total is updated on the profile tab.

The branded selfie feature is also available from this screen. The app captures a composite image of the camera feed, the 3D overlay, and a branded frame showing the building name and date, then saves it to the device gallery.

---

### Flow 4 - Student: 360 Degree Panorama Walkthrough

Students with an unlocked building can access its 360 degree walkthrough from the Buildings tab. The app fetches the full panorama graph for that building in one request, then opens the PanoramaViewer in fullscreen. The viewer renders the start scene as a panoramic sphere and places hotspot markers at their configured yaw and pitch positions.

The student can drag to pan around the scene and tap hotspot markers to move to connected scenes. Each transition loads the new panorama image without any page reload. The student can exit the viewer at any point using the back button in the top corner.

---

### Flow 5 - Student: Leaderboard and Rankings

Students can check their exploration points and see how they rank against other students from the Profile tab. Tapping View Leaderboard opens the Leaderboard screen, which shows the top three students on a podium with gold, silver, and bronze styling. Below the podium is the full ranked list showing each student's rank number and total points. A recent activity feed shows global quest completions in real time.

---

### Flow 6 - Professional: Building Access and Virtual Tour

Professional accounts have access to all campus buildings regardless of physical location. When a professional logs in, the Buildings tab shows all active buildings with an automatic role-based unlock applied. The professional does not need GPS, does not need to be on campus, and does not go through the geofence detection flow.

For each building, the professional can open the 360 degree walkthrough, launch the Magic Window VR tour, or view the 3D model. The Magic Window VR tour is exclusive to professionals. It renders the building's 3D model in landscape fullscreen and uses the device gyroscope for first-person camera control, letting the professional look around the model by rotating their physical device. This mode is designed for remote accreditation review where the professional needs to inspect building layouts without visiting in person.

---

### Flow 7 - Visitor: Limited Campus Overview

Visitors enter the app without an account. They can see the campus map with building pins and browse basic building information including name, description, and department. They cannot unlock buildings, view 3D models, enter 360 walkthroughs, complete quests, or access the AR camera.

When a visitor tries to take an action that requires authentication, the app shows a prompt directing them to register or log in. This makes the visitor experience a natural funnel toward student registration rather than a dead end.

---

### Flow 8 - Admin: Building Creation and Publishing

The admin workflow for getting a building live on the mobile app is a multi-step process managed entirely through the web dashboard. The admin starts by creating a building record in DRAFT status, which has no coordinate or slug requirement. This allows incomplete records to be saved at any stage without triggering validation errors.

From there, the admin uploads a 3D model file, configures interactive 3D hotspots via the raycaster web editor, sets the primary and associated departments, configures the geofence on the interactive Mapbox map, uploads panorama scenes and hotspots in the Panorama Manager, creates quests, quizzes, and trivia facts for the building, and finally sets the status to VISIBLE. The backend validates that all required fields are present when the status changes to VISIBLE. Once it passes, the building appears on the mobile app immediately without any app update.

---

### Flow 9 - Admin: Managing Professionals

Professional accounts are not self-registered. An admin creates them through the Professionals page in the dashboard. The creation modal takes the user's basic information and submits it to a restricted endpoint that only admin tokens can reach. The resulting account is created with `role=professional` and `email_verified=true` set automatically, so the professional can log in immediately without going through the OTP email flow.

---

### Flow 10 - Admin: Archive and Restore Buildings

Deleting a building in ARQuest does not permanently remove it by default. The admin clicks Move to Archive on a building, which triggers a soft delete. The backend sets `deleted_at` on the building and cascades the same to its associated quests and trivia facts. The building disappears from the mobile app, the live building list, and all geofence validation immediately.

The Archive page shows all soft-deleted buildings. The admin can restore a building, which clears the `deleted_at` timestamps and brings the building and its content back to live status. If the admin is certain the content should be permanently removed, they can hard delete it from the Archive page. Hard delete is permanent and cannot be undone.

---

### Flow 11 - Admin: System Settings and Feature Toggles

The CMS / Settings page gives the admin direct control over which features are active across the entire application. Changes made here take effect immediately because the mobile app reads the settings from the backend on startup and the backend enforces them on every API request.

The most important toggle is `maintenance_mode`. Turning it on blocks all non-admin API requests and the mobile app shows a maintenance banner. This is used when the team needs to run a database migration or server update without disrupting users with error messages.

Individual feature flags let the admin disable subsystems without touching code. GPS tracking, QR scanning, AR selfie capture, trivia modals, professional accreditation features, and the leaderboard can all be turned off independently. The `default_quest_reward` field sets the default points value that auto-fills when a new quest is created in the dashboard.

---

### Flow 12 - Admin: History & Logs

The History & Logs page gives the admin oversight into what is happening within the system. The admin navigates to the page and can see a paginated list of notifications, grouped by badges like System, Professional, Building, and Feedback.

The admin can sort these notifications by date and filter them to find specific events. The admin can also mark unread notifications as read, providing a continuous workflow for acknowledging system activity.
