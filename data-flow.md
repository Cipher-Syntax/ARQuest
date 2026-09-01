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
