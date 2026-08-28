# ARQuest — Context Diagram

> Last updated: 2026-08-28

---

## 1. System Context Diagram

This diagram shows ARQuest as a central system and its interactions with external users, device hardware, and external services.

```mermaid
graph TD
    %% Actors
    Student["Student<br/>(Mobile App User)"]
    Visitor["Visitor / Guest<br/>(Mobile App User)"]
    Prof["Professional / Accreditor<br/>(Mobile App User)"]
    Admin["Administrator<br/>(Web Dashboard User)"]

    %% Core System
    ARQuest(("ARQuest System<br/>(Mobile App, Admin Web Dashboard, Django REST API, PostgreSQL)"))

    %% External Systems & Device Services
    EmailSvc["Email Service<br/>(Brevo SMTP / OTP)"]
    GPSSvc["Device GPS & Compass<br/>(Expo Location / Sensor Telemetry)"]
    CamSvc["Device Camera & AR Sensors<br/>(Expo Camera & ViroReact AR)"]
    MediaSvc["Media Storage<br/>(File System / Cloud Assets)"]
    MapsSvc["Mapbox API<br/>(Vector Tiles & Campus Routing)"]

    %% Student Interactions
    Student -- "Explores campus, unlocks buildings via GPS/QR, navigates via Spatial AR, earns EXP & streaks, customizes profile" --> ARQuest
    
    %% Visitor Interactions
    Visitor -- "Views 2D campus map, explores public building directory, uses guest wayfinding" --> ARQuest
    
    %% Professional Interactions
    Prof -- "Performs facility evaluations, conducts 360° virtual tours & Magic Window VR walkthroughs" --> ARQuest
    
    %% Admin Interactions
    Admin -- "Manages campus facilities, geofences, 3D/360° assets, quests/trivia, user accounts, and monitors real-time dashboard analytics" --> ARQuest

    %% System to External Interactions
    ARQuest -- "Sends OTP verification & security emails" --> EmailSvc
    ARQuest -- "Reads GPS coordinates & compass azimuth for geofencing and AR chevrons" --> GPSSvc
    ARQuest -- "Streams camera frames for live AR overlay and QR code detection" --> CamSvc
    ARQuest -- "Stores and serves .glb 3D models, 360° panoramas, and thumbnails" --> MediaSvc
    ARQuest -- "Fetches vector map tiles and visual campus navigation paths" --> MapsSvc
```

---

## Documentation

### Overview

The Context Diagram establishes the operational boundaries of the ARQuest platform. It captures how distinct user roles interact with the system and how the platform leverages device hardware sensors and external cloud services.

### Actors

- **Student**: Primary mobile users who physically explore the campus. They unlock buildings via geofences or QR codes, follow native Spatial AR ground arrows, complete academic quests, maintain daily login streaks, participate in building quizzes, review their Campus Passport, and manage their avatars and account preferences.
- **Visitor / Guest**: Prospective students and campus guests who access public facility information, interactive 2D maps, and basic wayfinding without mandatory registration.
- **Professional / Accreditor**: Evaluators and faculty who utilize the mobile app for institutional accreditation. They bypass student gamification constraints, accessing full campus facility directories, visited building evaluation checklists, 360° panoramic virtual walkthroughs, and gyroscope-assisted Magic Window VR tours.
- **Administrator**: Institutional managers who operate the React 19 Web Dashboard to provision campus departments, publish 3D building models, calibrate geofence boundaries, author quests and quiz trivia, resolve user bug reports, configure system feature flags, and analyze real-time foot traffic and operational KPIs.

### External Services & Device Hardware

- **Email Service (Brevo)**: Dispatches automated 6-digit One-Time Password (OTP) verification emails for student registration.
- **Device GPS & Sensor Telemetry**: Provides real-time geolocation coordinates, location accuracy estimates, and compass heading (azimuth) for geofence validation and AR waypoint projection.
- **Device Camera & AR Framework (ViroReact)**: Captures live optical feeds for Spatial AR ground chevron rendering and fallback QR code scanning.
- **Media Storage**: Serves optimized 3D building models (`.glb`), high-resolution equirectangular panorama scenes, and department thumbnail images.
- **Mapbox API**: Powers high-performance vector map rendering, campus boundary layers, and walking route geometry.
