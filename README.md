<div align="center">

<img src="web/public/logo.png" alt="ARQuest Logo" width="600" />

# ARQuest

**A Sensor-Assisted Campus Exploration and Accreditation Support System**  
*Western Mindanao State University (WMSU) — BSIT Capstone 2026–2027*

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Three.js](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)

</div>

---

<div align="justify">

## 📌 Executive Summary & Research Abstract

**ARQuest** is an advanced mobile-based campus exploration and institutional accreditation support platform designed for Western Mindanao State University (WMSU). It integrates native 6DoF Spatial Augmented Reality (AR), self-sovereign campus pedestrian pathfinding, two-stage battery-optimized GPS geofencing, interactive 3D architectural digital twins, and equirectangular 360° virtual walkthroughs into a unified distributed ecosystem.

The system addresses the spatial disorientation experienced by freshmen and campus visitors while simultaneously providing remote academic accreditors and evaluators with a headset-free, gyroscope-synchronized virtual inspection portal. ARQuest is supported by a React 19 administrative GIS web dashboard and a Django REST Framework backend acting as the single authoritative source of truth.

---

## 🏛️ Core Technical Pillars

### 1. 🧭 Native Spatial AR Navigation (ViroReact)
- **6DoF Ground Chevrons**: Projects animated, glowing 3D ground arrows guiding users to target facilities in real time.
- **Sensor Telemetry Filtering**: An Exponential Moving Average (EMA) smoothing filter paired with a $2.5^\circ$ angular deadband suppresses compass magnetometer micro-jitter.
- **Off-Screen Perimeter HUD**: Dynamically evaluates the camera's $45^\circ$ field of view (FOV). Targets outside the viewing frustum trigger responsive 2D edge indicators (`◀ TURN LEFT` / `TURN RIGHT ▶`).
- **Arrival Latching with Hysteresis**: Approaching within $\le 25\text{m}$ latches Arrival Mode with a 20m hysteresis buffer, projecting a rotating 3D building miniature atop a holographic ground pedestal.

### 2. 🚶 Self-Sovereign Campus Pedestrian Navigation (A* Routing Engine)
- **Zero Third-Party Dependency**: Replaces commercial routing services (e.g., Mapbox Directions API) with an internal campus graph owned and computed by ARQuest.
- **Heuristic A\* Shortest-Path Algorithm**: The backend `apps.navigation` engine traverses a verified sidewalk graph (`NavigationNode` waypoints and `NavigationPath` segments) to calculate optimal walking routes based on geodesic length.
- **Dynamic GeoJSON Mapbox Overlay**: Synthesizes multi-point path geometries into GeoJSON `FeatureCollections` rendered natively on mobile Mapbox vector tiles in Electric Cyan with real-time distance and estimated walking times.
- **Satellite GIS Walking Network Editor**: Administrative web interface allowing operators to place waypoints (Entrances, Junctions, Gates, POIs) and trace multi-point sidewalk polylines directly over satellite imagery, featuring real-time client-side pruning of disconnected ways.

### 3. 🏢 Hybrid Multi-Modal Virtual Exploration & Spatial Linking
- **Interactive 3D Architectural Inspection**: Touch-controlled orbiting, panning, and zooming of optimized `.glb` campus structural models rendered in lightweight Three.js WebViews with PBR materials.
- **360° Panoramic Walkthroughs**: Spherical indoor walkthroughs mapped to inverted geometries with interactive raycasted room-to-room hotspots.
- **Bidirectional Spatial Linking**: Floating in-world 3D portal badges at eye level ($Y \approx 1.6\text{m}$) and contextual proximity HUD triggers ($\le 5\text{m}$) enable seamless transitions between 3D building tours and photographic 360° interior rooms while preserving camera coordinates.
- **Magic Window VR (Accreditor Mode)**: Synchronizes Three.js perspective camera rotation with mobile device gyroscope telemetry, providing hands-free first-person physical room inspection.

### 4. 🎮 Two-Stage GPS Geofencing & Gamified Campus Learning
- **Battery-Optimized Two-Stage Geofencing**: Client-side Haversine pre-filtering ($>75\text{m}$) eliminates over 95% of unnecessary mobile cellular requests before invoking authoritative server-side validation.
- **Gamification Arena (Student Role)**: Automated facility unlocks grant $+25\text{ EXP}$ and digital stamps in the Campus Passport, while building-specific trivia quizzes award $+50\text{ EXP}$.
- **Daily Login Streaks & Leaderboards**: Tracks consecutive daily student engagement and ranks learners on global university leaderboards.

### 5. 🛡️ Enterprise Security & Self-Service Account Governance
- **Role-Based Access Control (RBAC)**: Enforces strict permission classes across Student, Professional, Visitor, and Administrator tiers.
- **Cryptographic Authentication**: PBKDF2 password hashing, SimpleJWT token rotation (60-minute access / 7-day refresh), and Brevo SMTP 6-digit OTP email verification.
- **Self-Service Soft-Deactivation**: Users can deactivate their account (`is_active = False`) with immediate refresh token blacklisting while preserving all historical EXP, badges, and passport stamps in PostgreSQL. Accounts restore seamlessly on subsequent login (`reactivate: true`).
- **Offline Preference Persistence**: Local storage (`AsyncStorage`) persists user preferences including sound effect muting (`SoundManager`), haptics, distance units (meters/feet), and compass map auto-rotation.

---

## 👥 Role-Based Access Matrix

| Feature / Capability | Student | Professional (Accreditor) | Visitor (Guest) | System Administrator |
|:---|:---:|:---:|:---:|:---:|
| **Authentication Requirement** | Verified Email + OTP | Provisioned Account | None (Guest Session) | Superuser / Staff JWT |
| **Interactive 2D Mapbox Map** | ✅ | ✅ | ✅ | ✅ |
| **Custom WMSU A* Walking Routes** | ✅ | ✅ | ✅ | ✅ (GIS Editor) |
| **Native Spatial AR Chevrons & Turn HUD** | ✅ | — | ✅ | — |
| **Physical Geofence Building Unlocks** | ✅ | Bypass (All Unlocked) | — | — |
| **Interactive 3D Architectural Models** | ✅ | ✅ | ✅ | ✅ (CMS Upload) |
| **360° Panoramic Walkthroughs** | ✅ | ✅ | — | ✅ (Hotspot Studio) |
| **Magic Window VR (Gyroscope Mode)** | — | ✅ | — | — |
| **3D-to-360° Doorway Spatial Linking** | ✅ | ✅ | — | ✅ (Anchor Editor) |
| **Gamification Quests, Quizzes & EXP** | ✅ | — | — | ✅ (CMS Editor) |
| **Campus Passport / Stamp Card** | ✅ | Checklist Mode | — | — |
| **GIS Network Authoring & Pruning** | — | — | — | ✅ |
| **Real-Time Analytics & Feedback Radar** | — | — | — | ✅ |

---

## 👥 Development & Research Team

**Team Spiral** — BSIT Capstone 2026–2027  
*College of Computer Studies, Western Mindanao State University (WMSU)*

- **Hannah Jean T. Balimbingan** — Project Manager & Systems Analyst
- **Paolo A. Eijansantos** — UI/UX Designer & Frontend Developer
- **Justine A. Toong** — Lead Software Engineer & Systems Architect

**Academic Inquiries & Support**: `support@arquest.com`

---

## 📄 License & Intellectual Property

Developed as an academic capstone thesis at Western Mindanao State University. All rights reserved © 2026–2027.

</div>