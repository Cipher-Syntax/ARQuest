# ARQuest — Data Flow

> Last updated: 2026-09-01
> Comprehensive sequence diagrams covering all major user, admin, and sensor data flows.

---

## 1. User Registration, Terms Agreement & OTP Verification

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant API as Django API
    participant DB as PostgreSQL
    participant Email as Email Service (Brevo)

    User->>App: Fill Registration Form (Username, Email, Password, Name)
    User->>App: Check "I agree to Terms & Conditions and Privacy Policy"
    App->>API: POST /api/auth/register/\n{username, email, password, first_name, last_name}
    API->>DB: Create User (role='student', email_verified=False, is_active=True)
    API->>DB: Create EmailOTP (6 digits, expires in 10m)
    API->>Email: Send OTP verification email
    API-->>App: 201 Created
    App->>User: Display OTP Verification Screen

    User->>App: Enter 6-digit OTP
    App->>API: POST /api/auth/verify-otp/\n{email, otp}
    API->>DB: Validate OTP (active, not expired, matching code)
    API->>DB: Set email_verified=True, mark OTP used
    API-->>App: 200 OK + JWT Tokens (Access + Refresh)
    App->>App: Store tokens in SecureStore
    App->>User: Navigate to Avatar Selection / Home
```

---

## 2. Authentication, Token Rotation & Self-Service Reactivation

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant SecureStore as SecureStore / AsyncStorage
    participant API as Django API
    participant DB as PostgreSQL

    User->>App: Enter Username & Password
    App->>API: POST /api/auth/login/\n{username, password, reactivate: false}
    
    alt Account Active
        API->>DB: Authenticate credentials
        API-->>App: 200 OK + JWT Tokens + User Info
        App->>SecureStore: Store tokens securely
        App->>User: Navigate to Home Screen
    else Account Deactivated (is_active = False)
        API->>DB: Verify password matches hash
        API-->>App: 403 Forbidden {error: {code: "account_deactivated"}}
        App->>User: Display "Account Deactivated" Modal & Inline Prompt
        User->>App: Tap "Reactivate & Log In"
        App->>API: POST /api/auth/login/\n{username, password, reactivate: true}
        API->>DB: Set user.is_active = True
        API-->>App: 200 OK + JWT Tokens {reactivated: true}
        App->>User: Display "Welcome Back!" and Navigate to Home
    end

    Note over App,API: Automatic Token Refresh on 401...
    App->>API: API Request with expired Access Token
    API-->>App: 401 Unauthorized
    App->>API: POST /api/auth/token/refresh/ {refresh_token}
    API-->>App: 200 OK {access: new_token}
    App->>App: Retry original request seamlessly
```

---

## 3. GPS Geofencing & Building Unlock Flow

```mermaid
sequenceDiagram
    actor Student
    participant App as Mobile App
    participant GPS as Location Sensor (Expo)
    participant API as Django API
    participant DB as PostgreSQL

    loop Geolocation Polling (5s interval / 10m threshold)
        GPS-->>App: {latitude, longitude, accuracy}
        App->>App: Haversine distance pre-check
        App->>API: POST /api/geofencing/validate/\n{latitude, longitude, accuracy_meters}
        API->>DB: Query active building geofences
        API->>API: Evaluate distance against geofence radius
        API-->>App: {status: "inside"|"nearby"|"outside", building, distance}
    end

    alt Status = "inside" (First Discovery)
        App->>API: POST /api/buildings/unlock/ {building_id}
        API->>DB: Record BuildingUnlock (source="geofence")
        API->>DB: Award Student EXP points (+25 EXP)
        API-->>App: 200 OK {newly_unlocked: true, exp_awarded: 25}
        App->>App: Play unlock sound effect (SoundManager)
        App->>Student: Display "Building Discovered!" Banner & Stamp Card
    end
```

---

## 4. Native Spatial AR Navigation & HUD Guidance

```mermaid
sequenceDiagram
    actor Student
    participant ARView as Spatial AR View (ViroReact)
    participant Sensors as GPS + Compass Sensors
    participant Engine as AR Waypoint Math Engine

    Student->>ARView: Open AR Navigation to Target Building
    ARView->>Sensors: Request continuous location & compass heading (azimuth)
    Sensors-->>ARView: {userLat, userLng, compassHeading}

    loop Frame Rate Calculation (60 FPS)
        ARView->>Engine: calculateBearingAndDistance(userCoord, targetCoord)
        Engine->>Engine: Compute relative azimuth: targetBearing - compassHeading
        Engine->>Engine: Apply Exponential Moving Average (EMA) smoothing
        Engine-->>ARView: {smoothedBearing, distanceMeters, isOffScreen}
        
        alt Destination within 45° Camera FOV
            ARView->>ARView: Render 3D Ground Chevrons along ground plane
            ARView->>ARView: Display Floating 3D HUD (Distance + Building Name)
        else Destination outside Camera FOV (Off-Screen)
            ARView->>ARView: Render 2D Edge Arrow (◀ TURN LEFT or TURN RIGHT ▶)
        end
    end
```

---

## 5. 360° Virtual Walkthrough & Magic Window VR Flow

```mermaid
sequenceDiagram
    actor Accreditor as Professional / Accreditor
    participant App as Mobile App
    participant Gyro as Device Gyroscope
    participant ThreeJS as Three.js Web Panorama Viewer
    participant API as Django API
    participant DB as PostgreSQL

    Accreditor->>App: Select Building → Tap "360° Virtual Tour"
    App->>API: GET /api/panorama/buildings/{id}/scenes/
    API->>DB: Query active panorama scenes & navigation hotspots
    API-->>App: 200 OK {scenes: [...], hotspots: [...]}
    App->>ThreeJS: Load Scene Image & Initialize Spherical Geometry

    alt Magic Window VR Mode (Accreditor Exclusive)
        Accreditor->>ThreeJS: Enable VR Gyroscope Control
        loop Sensor Tracking
            Gyro-->>ThreeJS: Device Orientation {alpha, beta, gamma}
            ThreeJS->>ThreeJS: Update Three.js camera rotation in real time
        end
    end

    Accreditor->>ThreeJS: Tap Hotspot Marker (e.g. "To Laboratory")
    ThreeJS->>ThreeJS: Smooth spherical fade transition to linked Scene ID
```

---

## 6. Password Management & Self-Service Account Deactivation

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant AuthContext as AuthContext / SecureStore
    participant API as Django API
    participant DB as PostgreSQL

    %% Password Change
    User->>App: Open Account Settings → Tap "Change Password"
    User->>App: Enter Old Password, New Password, Confirm Password
    App->>API: POST /api/auth/change-password/\n{old_password, new_password, new_password_confirm}
    API->>DB: Verify old password hash & validate new password rules
    API->>DB: Update password hash in database
    API-->>App: 200 OK {message: "Password changed successfully"}
    App->>User: Show success alert

    %% Account Deactivation
    User->>App: Tap "Deactivate Account"
    User->>App: Enter Password to confirm identity
    App->>API: POST /api/auth/deactivate/\n{password, refresh_token}
    API->>DB: Verify password confirmation
    API->>DB: Set user.is_active = False
    API->>API: Blacklist JWT refresh token
    API-->>App: 200 OK {message: "Account deactivated"}
    App->>AuthContext: Clear stored tokens & reset state
    App->>User: Display confirmation and redirect to Login Screen
```

---

## 7. In-App Feedback Submission & Admin Resolution

```mermaid
sequenceDiagram
    actor Student
    actor Admin
    participant App as Mobile App
    participant Dashboard as Admin Web Dashboard
    participant API as Django API
    participant DB as PostgreSQL

    Student->>App: Open Settings → Tap "Report an Issue / Feedback"
    Student->>App: Select Category (Bug / Feature / Feedback) + Enter Description
    App->>API: POST /api/feedback/\n{type: "bug", message: "..."}
    API->>DB: Insert Feedback (status="open", user=Student)
    API->>DB: Create Notification (type="FEEDBACK", title="New Bug Report")
    API-->>App: 201 Created
    App->>Student: Show "Thank You for Feedback!" Alert

    Admin->>Dashboard: Open Admin Overview / Feedback Hub
    Dashboard->>API: GET /api/feedback/
    API->>DB: Query open feedback records
    API-->>Dashboard: 200 OK {feedbacks: [...]}
    Admin->>Dashboard: Review issue and mark status="resolved"
    Dashboard->>API: PATCH /api/feedback/{id}/ {status: "resolved"}
    API->>DB: Update status to resolved
    API-->>Dashboard: 200 OK
```

---

## 8. Real-Time Admin Dashboard Metrics Aggregation

```mermaid
sequenceDiagram
    actor Admin
    participant Dashboard as Admin Web Dashboard
    participant API as Django API
    participant DB as PostgreSQL

    Admin->>Dashboard: Access /dashboard (or tap "Refresh Data")
    Dashboard->>API: GET /api/dashboard/ (Authorization: Bearer <admin_token>)
    API->>DB: Count active buildings, total geofences, and 360° panoramas
    API->>DB: Count users by role (students, professionals, visitors, admins)
    API->>DB: Aggregate foot traffic unlocks (Daily, Weekly, Monthly, Yearly)
    API->>DB: Query Top 5 Most Visited & Least Visited buildings
    API->>DB: Calculate Quest Completion Rate (%)
    API->>DB: Fetch recent system audit notifications & open feedbacks
    API-->>Dashboard: 200 OK {total_buildings, active_students, gps_unlocks, role_distribution, content_coverage, recent_activity, recent_feedbacks}
    Dashboard->>Dashboard: Render dynamic Recharts foot traffic graphs, coverage progress bars, and live activity feed
```

---

## 9. Custom WMSU Campus Pedestrian Routing Flow (Unit 31)

```mermaid
sequenceDiagram
    actor Student
    participant App as Mobile App (Explore Tab)
    participant GPS as Location Sensor
    participant API as Django Navigation API
    participant Router as A* Routing Engine
    participant DB as PostgreSQL

    Student->>App: Tap Building Marker → Tap "Directions / Navigate"
    App->>GPS: Obtain current location {from_lat, from_lng}
    App->>API: GET /api/navigation/route/?from_lat=6.9120&from_lng=122.0600&to_building_id=<UUID>
    
    API->>DB: Query target building's entrance node
    API->>DB: Query nearest active navigation node to user origin
    API->>DB: Fetch all active NavigationPath segments (weights = distance_meters)
    API->>Router: Build campus graph & run A* Shortest Path
    Router->>Router: Compute optimal node sequence & stitch multi-coordinate geometry
    Router-->>API: Optimal path solution (coordinates, distance_meters, est_walk_minutes)
    
    API-->>App: 200 OK (GeoJSON FeatureCollection: LineString, distance, duration)
    App->>App: Update Mapbox Route Source with GeoJSON line (Electric AR Cyan)
    App->>Student: Display turn guidance & distance banner (bypasses Mapbox Directions API)
```

---

## 10. Admin Walking Paths Authoring & Real-Time Pruning Flow (Unit 31)

```mermaid
sequenceDiagram
    actor Admin
    participant Web as Admin Web Dashboard (NavigationPage.jsx)
    participant Map as Mapbox Satellite Map
    participant API as Django Navigation API
    participant DB as PostgreSQL

    Admin->>Web: Navigate to "Walking Paths" in Sidebar
    Web->>API: GET /api/navigation/nodes/ & GET /api/navigation/paths/
    API->>DB: Query all NavigationNodes and NavigationPaths
    API-->>Web: 200 OK {nodes: [...], paths: [...]}
    Web->>Map: Render waypoint markers (centered pins) & GeoJSON walkway lines

    %% Node Creation
    Admin->>Map: Click satellite terrain in "Drop Waypoint" mode
    Web->>Admin: Open "New Waypoint Node" modal (Label, Role, Linked Building)
    Admin->>Web: Fill form (Role = "Walkway") → Tap "Save Waypoint"
    Web->>API: POST /api/navigation/nodes/ {label, latitude, longitude, node_type: "junction"}
    API->>DB: Insert NavigationNode
    API-->>Web: 201 Created {node}
    Web->>Map: Render new centered circular waypoint marker

    %% Pathway Drawing
    Admin->>Map: Select start node → Click path bends → Select destination node
    Web->>API: POST /api/navigation/paths/ {start_node, end_node, geometry: [[lng,lat],...]}
    API->>DB: Insert NavigationPath (auto-calculates geodesic distance_meters)
    API-->>Web: 201 Created {path}
    Web->>Map: Draw new connected walkway line (dead-center bullseye connection)

    %% Waypoint Deletion & Auto-Pruning
    Admin->>Web: Select waypoint node → Tap Trash icon → Confirm Delete
    Web->>API: DELETE /api/navigation/nodes/{id}/
    API->>DB: Delete NavigationNode (PostgreSQL cascades deletion of all attached paths)
    API-->>Web: 204 No Content
    Web->>Web: Filter nodes state AND synchronously prune all connected paths from paths state
    Web->>Map: Instantly remove waypoint circle AND remove all attached walkway lines from map
```

---

## 11. 3D Virtual Tour to 360° Panorama Spatial Linking Flow (Unit 30)

```mermaid
sequenceDiagram
    actor User
    participant VT as VirtualTourViewer (Three.js 3D Model)
    participant Proximity as Spatial Proximity Engine
    participant Pano as PanoramaViewer (Three.js 360° Sphere)
    participant API as Django Panorama API

    User->>VT: Walk inside building 3D model using Virtual Joystick
    loop Every Animation Frame
        VT->>Proximity: Read virtual camera (X, Y, Z) coordinates
        Proximity->>Proximity: Compare distance against PanoramaScene spatial anchors (pos_x, pos_y, pos_z)
    end

    alt Camera within 5m of Room Spatial Anchor
        Proximity-->>VT: Room detected (e.g., "Computer Lab 1")
        VT->>User: Update Top HUD: [ 🌐 VIEW COMPUTER LAB 1 360° ]
        VT->>User: Render glowing 3D Portal Badge floating at doorway (Y = 1.6m)
    else Camera outside mapped anchors (> 5m)
        VT->>User: Display generic [ 🌐 360° PANORAMA ] button (opens Room Selector modal)
    end

    User->>VT: Tap 3D Portal Badge OR Top HUD Button
    VT->>VT: Save current 3D camera position & orientation
    VT->>Pano: Transition to 360° PanoramaViewer with target scene ID
    Pano->>User: Display immersive 360° photo sphere of selected room

    User->>Pano: Tap "X" (Close) Button
    Pano-->>VT: Dismiss panorama
    VT->>VT: Restore saved camera position & orientation
    VT->>User: Resume first-person 3D Virtual Tour seamlessly
```
