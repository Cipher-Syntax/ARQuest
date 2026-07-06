<div align="center">
  
<img src="web/public/logo.png" alt="ARQuest Logo" width="200" />

# ARQuest

**A Sensor-Assisted Campus Exploration and Accreditation Support System**  
*Featuring GPS Geofencing, 3D Building Visualization, Gamification, and 360° Virtual Walkthroughs.*

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Three.js](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)

</div>

---

<div align="justify">

## 📌 Project Overview

**ARQuest** is a mobile-based campus exploration and accreditation support system designed to enhance spatial learning, navigation, and institutional evaluation through location-aware and visual technologies. 

The system integrates GPS geofencing, 3D building visualization, gamified exploration, and 360° panoramic walkthroughs into a unified Android-compatible application. It is built using **React Native (Expo)** on the frontend and powered by a robust **Django REST Framework (DRF)** backend. 

It supports four distinct user roles: **Admin**, **Students**, **Professionals (Accreditors/Personnel)**, and **Visitors**, providing tailored experiences for each.

---

## ✨ Core Features

### 📍 GPS Geofencing & Campus Navigation (Google Maps)
- Detects user location in real-time to trigger automated building unlocks.
- Defines campus zones per building using precise latitude/longitude radiuses.
- Powered by the **Google Maps API** for robust point-to-point visual routing and highly accurate map tiles.

### 🎮 Gamification & Quest System
- **Daily Login Streaks:** Rewards consistent daily engagement with bonus exploration points.
- **Dynamic Quests:** Directs students to specific buildings to complete objectives.
- **Trivia & Learning:** Displays building-specific quizzes, flashcards, and trivia facts to reinforce contextual learning.
- **Leaderboard & Ranks:** Global student rankings with Gold/Silver/Bronze tiers based on total exploration points.

### 🏢 3D Building Visualization
- Displays interactive, pre-created `.glb/.gltf` 3D building models.
- Accessible immediately after a building is unlocked via geofencing.
- Supports touch-based rotation, zoom, and spatial inspection of campus layouts.

### 📸 AR-Style Camera Interface & Branded Selfies
- Immersive camera-based UI that overlays 3D models and floating labels onto the live camera feed.
- **Branded Selfies:** Users can capture composite photos featuring the camera feed, the 3D model, and a custom WMSU campus frame, instantly saving it to their device gallery.

### 🌐 360° Virtual Walkthroughs & Magic Window VR
- **Panorama-based Navigation:** Allows users to virtually explore campus spaces (e.g., Entrance → Hallway → Classroom → Office) via clickable hotspots.
- **Magic Window VR (Accreditor Mode):** Exclusive to professional accounts, this mode utilizes the device's gyroscope to create a first-person virtual reality experience for remote building inspection and evaluation.

### 🛡️ Robust Admin Management System (React Web Dashboard)
- **Draft Workflows & Soft-Deletes:** Safe content management allowing admins to save incomplete drafts and archive buildings without permanent data loss.
- **Interactive Geofence Editor:** Visual map interface for defining campus boundaries.
- **System Feature Toggles:** Admins can instantly enable or disable modules (GPS, QR, Trivia, Maintenance Mode) on the fly without requiring mobile app updates.

---

## 👥 Users and Their Needs

### 🎓 Students
- Need guided, engaging, and gamified campus exploration.
- Benefit from automatic building discovery, daily streak incentives, and interactive trivia.
- Require visual understanding of campus structures via 3D models and customized profiles (avatars).

### 👔 Professionals (Accreditors / Personnel)
- Need remote or assisted facility evaluation without physical geofence restrictions.
- Require structured 360° walkthroughs and Gyroscope-enabled VR tours for immersive inspections.
- Need organized documentation per department and building.

### 🛠️ Administrators
- Manage the entire platform via a dedicated web dashboard.
- Upload images, 360° panoramas, 3D models, and define geofence zones.
- Control gamification content, quests, system settings, and professional account provisioning.

### 🚶 Visitors
- Need simplified, read-only campus information access.
- Benefit from visual and location-based navigation support before deciding to register.

---

## 🚀 Core User Flows

### 1️⃣ Student Flow
1. **Open App:** Launch ARQuest; session is restored via secure JWT tokens.
2. **Explore:** System continuously tracks GPS location via the campus map.
3. **Discover:** User enters a predefined campus zone.
4. **Unlock:** System automatically unlocks the building and awards points.
5. **Interact:** User views the 3D model, completes quests, reads trivia, or takes a branded AR selfie.
6. **Progress:** Points, streaks, and ranks are updated on the global leaderboard.

### 2️⃣ Accreditor Flow
1. **Login:** Access the system via an admin-provisioned professional account.
2. **Select:** Choose any campus building (bypassing geofence requirements).
3. **Inspect:** Enter the **360° Virtual Walkthrough** or activate **Magic Window VR** (Gyroscope mode).
4. **Evaluate:** Navigate hotspot-based views to review building layouts and documentation remotely.

### 3️⃣ Admin Flow
1. **Dashboard:** Log into the React 19 web admin dashboard.
2. **Draft & Create:** Add a new building, saving it as a draft until all assets are ready.
3. **Configure:** Define geofences via the interactive map, upload `.glb` models, and set up 360° panorama hotspots.
4. **Publish:** Change the building status to `VISIBLE`, instantly pushing the content to all mobile users.

---

## 💻 Technology Stack

### 📱 Mobile Application
- **Framework:** React Native (Expo Managed Workflow)
- **Mapping:** Google Maps API & Expo Location (GPS/Geofencing)
- **Camera/Media:** Expo Camera API, react-native-view-shot, Expo Media Library
- **3D/Rendering:** WebView, Three.js (for GLB rendering and panoramic spheres)

### ⚙️ Backend API
- **Framework:** Django 5 & Django REST Framework (DRF)
- **Authentication:** SimpleJWT (Access/Refresh Tokens), Brevo SMTP (OTP Emails)
- **Database:** PostgreSQL (with custom Soft-Delete architecture)

### 🖥️ Admin Web Dashboard
- **Framework:** React 19, Vite, React Router DOM
- **HTTP Client:** Axios (with interceptors)
- **Mapping/UI:** Leaflet (for geofence configuration), TailwindCSS / Vanilla CSS

### 🎨 3D Modeling & Visualization
- **Creation:** SketchUp, Blender
- **Format:** Optimized `.glb` / `.gltf`
- **Engine:** Three.js

---

## 🎯 Scope & Design Principles

### **Included in Scope**
- GPS-based automatic building unlocking (geofencing).
- 3D building visualization and 360° virtual accreditation walkthroughs.
- Gamified learning (Trivia, Quests, Streaks, Leaderboards).
- AR-style camera-based UI experience (non-ARCore).
- Admin dashboard for comprehensive content, asset, and system management.

### **Out of Scope**
- Full ARCore world-anchored augmented reality (real-time spatial tracking).
- Indoor centimeter-level positioning systems.
- Unity-based immersive VR headset simulation.
- LiDAR / RoomPlan-based automatic 3D reconstruction.

### **Key Design Principle**
ARQuest is a **location-triggered** system, not a real-time world-tracking AR application. GPS geofencing is the primary mechanism for unlocking campus content. The architecture prioritizes lightweight deployability on standard Android devices using Expo React Native, relying on pre-created 3D models and 360° media for robust visualization without the overhead of heavy native game engines.

</div>