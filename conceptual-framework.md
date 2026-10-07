# ARQuest — Conceptual Framework (IPO Model)

> **Research Paper Component:** Chapter 1 / Chapter 3 — Conceptual Framework of the Study  
> **System:** ARQuest: A Sensor-Assisted Campus Exploration and Accreditation Support System  
> **Institution:** Western Mindanao State University (WMSU)  
> **Document Format:** Standard A4 Bond Paper (Portrait Orientation: 210mm × 297mm)

---

## 1. Conceptual Framework Diagram
The conceptual framework of **ARQuest** is grounded on the classic **Input-Process-Output (IPO)** model with a continuous feedback and recalibration mechanism. 

The diagram follows the standard academic **3-Column Input-Process-Output (IPO)** architecture (**INPUT** $\rightarrow$ **PROCESS** $\rightarrow$ **OUTPUT**) with a continuous feedback and recalibration loop spanning the bottom, ensuring visual balance, high readability, and standard research thesis compliance.

```mermaid
flowchart TD
    %% ==========================================
    %% CORE IPO PIPELINE (3-COLUMN ARCHITECTURE)
    %% ==========================================
    subgraph IPO_PIPELINE ["INPUT - PROCESS - OUTPUT ARCHITECTURE"]
        direction LR

        subgraph INPUT ["1. INPUT"]
            direction TB
            IN_1["<b>A. Hardware & Sensors</b><br/>• High-Accuracy GPS Coordinates<br/>• Magnetometer Compass Heading<br/>• 3-Axis Gyroscope Telemetry<br/>• Camera Video Stream & QR Scans"]
            IN_2["<b>B. User Profiles & Telemetry</b><br/>• WMSU Institutional Email & Passwords<br/>• 4-Tier Role Permissions (RBAC)<br/>• Audio, SFX & Haptics Settings<br/>• User Issue & Bug Reports"]
            IN_3["<b>C. University Geospatial Assets</b><br/>• Campus POIs & Geofence Polygons<br/>• Pedestrian Sidewalk Walking Graph<br/>• 3D Architectural Models (.glb)<br/>• 360° Panoramas & Doorway Anchors"]
            IN_1 ~~~ IN_2 ~~~ IN_3
        end

        subgraph PROCESS ["2. PROCESS"]
            direction TB
            PR_1["<b>A. Security & Access Control</b><br/>• PBKDF2 Hashing & SimpleJWT<br/>• Brevo SMTP 6-Digit Email OTP<br/>• Role-Based Access Control Guards<br/>• Soft-Deactivation & Restoration"]
            PR_2["<b>B. Spatial & Sensor Fusion</b><br/>• Two-Stage Haversine Filtering<br/>• 60 FPS EMA Heading Smoothing<br/>• Heuristic A* Pedestrian Routing<br/>• 45° Camera Frustum FOV Check"]
            PR_3["<b>C. Virtual Inspection & Analytics</b><br/>• Three.js Physically Based Rendering<br/>• Gyro Magic Window VR Walkthroughs<br/>• Proximity 3D-to-360° Portals (5m)<br/>• Foot Traffic Recharts Aggregations"]
            PR_1 ~~~ PR_2 ~~~ PR_3
        end

        subgraph OUTPUT ["3. OUTPUT"]
            direction TB
            OUT_1["<b>A. Spatial AR Wayfinding</b><br/>• Real-Time 3D Ground Chevrons<br/>• Tactical Distance HUD Billboards<br/>• 2D Turn Alerts (◀ LEFT / RIGHT ▶)<br/>• Cyan Sidewalk Route Line Overlays"]
            OUT_2["<b>B. Facility Exploration Deliverables</b><br/>• Automated Building Discovery Unlocks<br/>• Touch-Manipulated 3D Twins<br/>• Room-to-Room 360° VR Tours<br/>• Seamless Orbit-to-Interior State"]
            OUT_3["<b>C. Gamification & Administration</b><br/>• Student EXP Progression & Streaks<br/>• Campus Passport Discovery Stamps<br/>• Live Operational KPI Dashboard<br/>• Validated Campus Sidewalk Topology"]
            OUT_1 ~~~ OUT_2 ~~~ OUT_3
        end

        INPUT ==>|"Continuous Sensor Telemetry & Requests"| PROCESS
        PROCESS ==>|"Computed Guidance Vectors & Digital Twins"| OUTPUT
    end

    %% ==========================================
    %% CONTINUOUS FEEDBACK RECALIBRATION LOOP
    %% ==========================================
    subgraph FEEDBACK ["4. FEEDBACK & CONTINUOUS RECALIBRATION LOOP"]
        direction TB
        FB_1["• Continuous GPS Drift Tracking continuously re-evaluates geofencing and proximity<br/>• Off-path deviation triggers real-time heuristic A* sidewalk route recalculation<br/>• Administrative GIS updates and geofence changes immediately synchronize to mobile clients<br/>• Mobile bug reporting and feedback radar triage continuously refine system reliability"]
    end

    OUTPUT ==>|"Operational Metrics & Diagnostics"| FEEDBACK
    FEEDBACK -.->|"Dynamic Drift Correction & GIS Parameter Synchronization"| INPUT
```

---

## 2. Input-Process-Output Specification Matrix

| Dimension | Domain Category | Specific Technical Elements | Operational Function in the Study |
|:---|:---|:---|:---|
| **INPUT** | **Sensor Telemetry** | GPS coordinates, accuracy radius, magnetometer azimuth, 3-axis gyroscope telemetry, optical camera stream, QR codes. | Supplies dynamic real-world spatial positioning, orientation, and optical data required for AR projection and location validation. |
| | **User Profiles** | Registration credentials, mandatory legal agreements, avatar choices, client preferences (SFX, haptics, units), bug reports. | Governs user identity, legal compliance, customizable local preferences, and in-app diagnostics. |
| | **Geospatial Assets** | Facility data, geofences, 3D glTF/GLB models, equirectangular 360° photo spheres, 3D doorway anchors $(X, Y, Z)$, walking graph. | Supplies physical digital twin data, 3D models, navigation topology, and institutional metadata. |
| **PROCESS** | **Security & Auth** | PBKDF2 hashing, SimpleJWT token rotation, email OTP verification, soft-deactivation flags, 4-tier RBAC guards. | Enforces security and role isolation while enabling self-service account restoration. |
| | **Geospatial & AR** | Client Haversine pre-filter, server Haversine check, EMA compass smoothing ($2.5^\circ$ deadband), ViroReact 6DoF AR, FOV branching. | Converts raw sensor telemetry into stable 3D visual wayfinding overlays and automated facility unlock triggers. |
| | **Campus Routing** | Nearest-node snapping, adjacency graph generation, heuristic $A^*$ graph search over verified walkways, GeoJSON compilation. | Computes optimal walking paths along real WMSU sidewalks without external third-party routing dependencies. |
| | **Virtual Exploration** | Three.js WebViews, PBR shaders, equirectangular mapping, gyroscope binding, doorway proximity detection ($\le 5\text{m}$). | Renders 3D architectural models, enables Magic Window VR, and bridges 3D spaces with 360° interior photo spheres. |
| | **Gamification & GIS** | Rule-based EXP distribution, login streaks, building quizzes, badge triggers, satellite GIS editor, disconnected way pruning. | Promotes spatial campus learning and equips administrators with self-healing tools to maintain campus network topology. |
| **OUTPUT** | **Spatial Guidance** | 3D ground chevrons, 2D off-screen perimeter arrows (`◀ LEFT` / `RIGHT ▶`), Electric Cyan walking routes, unlock alerts. | Guides users to campus destinations through real-time visual and sensor-assisted cues. |
| | **Virtual Models** | Interactive 3D building viewer, first-person tours, Magic Window VR walkthroughs, eye-level doorway portal badges ($Y \approx 1.6\text{m}$). | Enables remote and on-site facility evaluation for students, visitors, and institutional accreditors. |
| | **Gamification & Ops** | Campus Passport stamps, EXP levels, streak badges, global leaderboards, Recharts foot traffic charts, Feedback Radar tickets. | Rewards student exploration milestones and provides university administrators with real-time institutional analytics. |
| **FEEDBACK** | **Recalibration Loop** | Dynamic GPS polling, continuous heading re-alignment, route re-calculation upon deviation, real-time administrative GIS sync. | Closes the cyber-physical control loop, ensuring dynamic adaptation to physical movement and administrative network edits. |

---

## 3. Narrative Discussion of the Framework

### 3.1 The Input-Process-Output with Feedback Model
The conceptual framework of ARQuest follows the Input-Process-Output (IPO) model with a continuous feedback and recalibration loop. Unlike static transactional software, location-aware AR platforms operate as continuous cyber-physical control loops:
1. **Inputs (Top Tier)**: The system ingests physical hardware telemetry (GPS coordinates, heading, gyroscope angles, optical feed), user profile data (credentials, preferences, feedback), and administrative spatial data (facilities, geofences, 3D models, 360° panoramas, walking graphs).
2. **Processes (Middle Tier)**: These inputs are transformed by specialized computational engines: identity verification via PBKDF2 and SimpleJWT; battery-efficient two-stage geofencing; 60 FPS ViroReact spatial AR projection with EMA sensor smoothing; server-side heuristic $A^*$ pedestrian pathfinding; Three.js multi-modal 3D/360° rendering with spatial doorway bridging; and gamification rule processing.
3. **Outputs (Lower Tier)**: The system produces actionable spatial artifacts: glowing 3D ground arrows, 2D off-screen turn indicators, Electric Cyan campus walking paths, interactive 3D digital twins, Magic Window VR walkthroughs, Campus Passport stamps, and administrative operational intelligence.
4. **Feedback & Recalibration (Bottom Tier)**: As the user navigates the campus, dynamic changes in user coordinates and sensor telemetry feed into the system to recalculate AR chevrons and geofence proximities. Furthermore, administrative edits in the web GIS editor immediately update the topological graph, refreshing future route outputs without requiring client rebuilds.

---

## 4. Microsoft Word & Bond Paper Formatting Guide

When transferring this framework into your final Capstone manuscript (e.g., in Microsoft Word or Google Docs):

1. **Page Setup**:
   - Paper Size: **A4** ($210\text{ mm} \times 297\text{ mm}$) or **Letter** ($8.5'' \times 11''$).
   - Orientation: **Portrait**.
   - Margins: Standard Academic Margins (**1.5 inches Left** for binding, **1.0 inch Top, Right, and Bottom**).
2. **Figure Positioning**:
   - Title: **Figure 3.1. Conceptual Framework of the System (IPO Model)** centered above or below the diagram according to your institutional thesis guidelines.
   - Text Size in Diagram: When pasted as an image or recreated as Word shapes, maintain **10 pt to 11 pt font size** for bullet points and **12 pt Bold** for domain headers to ensure high legibility.
   - Flow Direction: Strict top-to-bottom vertical progression (**INPUT** $\rightarrow$ **PROCESS** $\rightarrow$ **OUTPUT** $\rightarrow$ **FEEDBACK**).
