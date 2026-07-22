# ARQuest — Conceptual Framework

> Last updated: 2026-06-22

---

## 1. Input-Process-Output (IPO) Model

```mermaid
flowchart LR
    subgraph INPUT ["Inputs"]
        I1["User Credentials & Registration Data"]
        I2["Device GPS Coordinates & Accuracy"]
        I3["QR Code Scans"]
        I4["Camera Feed (AR) & Device Gyroscope"]
        I5["Admin Data Entry (Buildings, Quests, Trivia)"]
        I6["Media Uploads (3D Models, Panoramas)"]
        I1 --> I2 --> I3 --> I4 --> I5 --> I6
    end

    subgraph PROCESS ["Processes"]
        P1["JWT Authentication & Role-Based Access Control"]
        P2["Haversine Geofence Validation"]
        P3["3D Model & 360° Panorama Rendering (Three.js)"]
        P4["AR Overlay Composition"]
        P5["Gamification Engine (Points & Quest Tracking)"]
        P6["Content Management & Soft-Delete Archiving"]
        P7["Notification & Feedback Processing"]
        P8["Centralized Mobile State Management"]
        P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8
    end

    subgraph OUTPUT ["Outputs"]
        O1["JWT Access & Refresh Tokens"]
        O2["Building Unlock Status & Proximity Alerts"]
        O3["Interactive 3D Visualizations & Walkthroughs"]
        O4["AR Trivia Modals & Branded Selfies"]
        O5["Updated Leaderboard Rankings"]
        O6["Admin Dashboard Metrics & Reports"]
        O7["History Logs & System Notifications"]
        O1 --> O2 --> O3 --> O4 --> O5 --> O6 --> O7
    end

    INPUT --> PROCESS
    PROCESS --> OUTPUT
```

---

## Documentation

### Overview

The Conceptual Framework of ARQuest is built upon the Input-Process-Output (IPO) model. This framework illustrates how raw data and user interactions are transformed into meaningful features, immersive visualizations, and administrative insights.

### Inputs

The system ingests data from two primary sources: mobile device sensors and user input. The mobile application continuously feeds GPS coordinates, camera frames, and gyroscope telemetry to the system. Users provide authentication credentials, while administrators input structural campus data, configure geofences, and upload heavy media assets like `.glb` 3D models and panorama images.

### Processes

The core logic of ARQuest resides in its processing layer, primarily handled by the Django backend and mobile WebViews:
- **Location Processing**: The geofencing engine uses the Haversine formula to validate user proximity to building boundaries.
- **Visualization Rendering**: Three.js engines inside mobile WebViews parse 3D models and map equirectangular images into interactive 360° spheres or Magic Window VR views with Gyroscope controls.
- **Gamification Logic**: The backend validates quest completions, calculates reward points and daily streaks, issues trivia facts, and updates user progress atomically.
- **Security & Access**: All incoming requests are routed through JWT validation and strict Role-Based Access Control (RBAC) to ensure users only access what their role (Student, Admin, Professional) permits. Environment security enforces strict separation of secrets from source control using `.env.example` templates.
- **Centralized State Management**: The mobile app uses a global Context architecture to coordinate complex state (like GPS tracking, authentication, and building unlocks) securely and efficiently across screens, optimizing battery usage through background pausing.
- **Content Management**: Advanced features like Soft-Delete Archiving, multi-building department grouping, and draft workflows ensure data integrity without permanent data loss.
- **Notification Processing**: Real-time evaluation of events to generate system, professional, building, and feedback notifications that provide admins with actionable history logs.

### Outputs

The processed data results in tangible outputs for the user. Successful authentication yields JWT tokens and session data (including customizable avatars). Geofence validation results in building unlocks or proximity warnings (e.g. A-to-B navigation routing). 3D rendering processes output interactive, explorable models and immersive AR overlays. Gamification processes output increased exploration points, daily streak bonuses, trivia displays, and updated leaderboard standings. For administrators, the system outputs structured dashboard metrics, configuration states, and history logs with categorized notifications.
