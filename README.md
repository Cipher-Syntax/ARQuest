<div align="center">
  
<img src="web/public/logo.png" alt="ARQuest Logo" width="600" />

# ARQuest

**A Sensor-Assisted Campus Exploration and Accreditation Support System**  
*Featuring Native Spatial AR, GPS Geofencing, 3D Building Visualization, Gamification, and 360° Virtual Walkthroughs.*

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Three.js](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white)

</div>

---

<div align="justify">

## 📌 Project Overview

**ARQuest** is a mobile-based campus exploration and accreditation support system designed to enhance spatial learning, navigation, and institutional evaluation across Western Mindanao State University (WMSU) through location-aware, augmented reality, and 3D visual technologies.

The system integrates **Native Spatial AR (ViroReact)** with real-time ground chevrons, GPS geofencing, 3D building inspection, gamified quests, and 360° panoramic virtual walkthroughs into a unified cross-platform mobile application, supported by a React 19 administrative web dashboard and a Django REST Framework backend.

It enforces strict Role-Based Access Control (RBAC) across four distinct user roles: **Student**, **Professional (Accreditor / Faculty)**, **Visitor (Guest)**, and **Administrator**.

---

## ✨ Core Features

### 📍 GPS Geofencing & Campus Map Navigation
- Real-time location detection with automated campus building discoveries.
- Defines precise polygon and circular geofence boundaries per campus facility.
- Powered by the **Mapbox API** for interactive 2D maps, building search, and walking routes.

### 🧭 Native Spatial AR Navigation (ViroReact)
- **3D Ground Chevrons**: Projects glowing crimson and gold ground chevrons guiding users to their destination.
- **Off-Screen Turn HUD**: 2D edge indicators (`◀ TURN LEFT` / `TURN RIGHT ▶`) active when the destination is outside the camera's 45° field of view.
- **Sensor Smoothing**: Exponential Moving Average (EMA) and deadband azimuth filtering eliminate compass micro-jitter and drift.
- **PBR glTF Enhancements**: Double-sided, solid opaque PBR shaders for high-fidelity 3D miniature rendering.

### 🎮 Gamification & Quest Arena (Student Role)
- **Daily Login Streaks**: Consecutive login tracking with daily EXP rewards and streak bonus milestones.
- **Missions & Limited Challenges**: Directs students to explore campus facilities and complete objectives.
- **Interactive Quizzes & Trivia**: Contextual trivia facts and building quizzes reinforcing institutional knowledge.
- **Global Leaderboard & Badges**: Real-time student rankings with tiered badges and level titles.

### 🏢 3D Building Inspection & 360° Virtual Walkthroughs
- **Interactive 3D Models**: Touch-based rotation, zoom, and spatial inspection of `.glb/.gltf` campus structures.
- **360° Panoramic Walkthroughs**: Indoor exploration via interactive spatial hotspots (Entrance → Hallway → Office → Labs).
- **Magic Window VR (Accreditor Mode)**: Gyroscope-enabled first-person virtual tour for remote institutional evaluation.

### 🛡️ Account Settings, Preferences & Self-Service Deactivation
- **Account Settings**: Real-time avatar picker gallery, editable profile name, locked system credentials, and password management.
- **Self-Service Deactivation & Reactivation**: Enables users to soft-deactivate their account (`is_active = False`) while safely preserving all EXP, badges, and passport stamps. Reactivates seamlessly upon next login.
- **App Preferences**: Mute/unmute SFX audio via `SoundManager`, toggle haptic vibrations, switch distance units (Meters vs Feet), compass map rotation, and 3D cache cleaner.
- **Legal Compliance Onboarding**: Mandatory Terms and Conditions & Privacy Policy agreement step before app access.

### 📊 Real-Time Admin Web Dashboard (React 19 & Vite)
- **Live Operational Status**: Real-time campus health, total facilities, active students, and daily foot traffic.
- **Interactive Recharts Visualizations**: Daily, weekly, monthly, and yearly foot traffic trends with Bar/Area graph toggles.
- **Content Coverage Matrix**: Real-time deployment tracking for 360° panoramas, geofences, quests, and quizzes.
- **User Role Composition**: Real-time distribution breakdown across Students, Accreditors, Visitors, and Admins.
- **Issue & Feedback Radar**: Centralized hub for reviewing and resolving bug reports and feature requests submitted from the mobile app.

---

## 👥 User Roles

| Role | Access Scope |
| :--- | :--- |
| **Student** | Full gamification arena, quests, building quizzes, leaderboard rankings, Campus Passport discoveries, Spatial AR wayfinding, 3D models, custom avatars. |
| **Professional / Accreditor** | Evaluation portal bypass, full campus directory, visited buildings evaluation checklist, 360° virtual tours, Magic Window VR walkthroughs (gamification popups hidden). |
| **Visitor / Guest** | Public 2D campus directory, public facility info, guest AR navigation, read-only exploration without mandatory account registration. |
| **Administrator** | Full Web Dashboard access: campus building authoring, geofence calibration, 360° panorama hotspots, quest/trivia CMS, user provisioning, system feature flags, and live analytics. |

---

## 👥 Development Team

**Team Spiral** — BSIT Capstone 2026–2027  
*College of Computer Studies, Western Mindanao State University (WMSU)*

- **Hannah Jean T. Balimbingan** — Project Manager
- **Paolo A. Eijansantos** — UI/UX Designer
- **Justine A. Toong** — Lead Developer

**Support & Inquiries**: `support@arquest.com`

---

## 📄 License

This project is developed as part of the academic capstone curriculum at Western Mindanao State University. All rights reserved.

</div>