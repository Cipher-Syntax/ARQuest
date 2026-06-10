# ARQuest: A Sensor-Assisted Augmented Reality Campus Exploration and Accreditation Support System with GPS Geofencing, QR-Based AR Interaction, and 360° Virtual Campus Walkthrough

---

# PROJECT OVERVIEW

ARQuest is a role-based smart campus system designed to enhance campus exploration, learning engagement, and accreditation processes through mobile technology. It integrates GPS geofencing, QR-based augmented reality scanning, 3D visualization, and 360° virtual walkthroughs into a unified platform.

The system is built for Android devices using React Native, with a Django backend for content and user management. It supports four user roles: Students, Professionals (Accreditors/Personnel), Admins, and Visitors.

---

# WHAT THE SYSTEM ACTUALLY DOES

ARQuest transforms a physical campus into a digitally interactive environment.

It allows:

- Students to explore campus buildings through GPS-based unlocking and AR interactions
- Users to scan building logos or QR codes to trigger AR content
- Viewing of 3D building models and educational trivia
- Taking AR-based photos/selfies with campus elements
- Accreditation personnel to access 360° virtual walkthroughs of facilities
- Admins to manage buildings, content, AR assets, and geolocation data

The system enhances—not replaces—physical campus interaction.

---

# USERS AND THEIR NEEDS

## Students
- Need guided campus exploration
- Need interactive learning about buildings
- Need visual and engaging content instead of static orientation

## Professionals (Accreditors / Personnel)
- Need structured campus documentation
- Need remote access to facility visualization
- Need efficient campus evaluation tools

## Admins
- Need to manage campus data dynamically
- Need to upload buildings, media, and AR content
- Need control over geolocation and system updates

## Visitors
- Need simple campus information access
- Need basic navigation and public building details

---

# CORE USER FLOWS

## Student Flow

1. Open ARQuest app
2. System detects GPS location
3. Nearby building is unlocked in list view
4. User scans QR code or building marker
5. AR content is displayed (3D model + information)
6. User views trivia and answers mini quizzes
7. User optionally takes AR selfie
8. System records visited buildings

---

## Accreditor Flow

1. Open Accreditation Mode
2. Select a building (e.g., CCS)
3. Access 360° virtual walkthrough
4. Navigate through hotspots (Entrance → Hallway → Lab)
5. View facility documentation and multimedia
6. Proceed to next building

---

## Admin Flow

1. Login to admin panel
2. Add new building
3. Upload:
   - GPS coordinates
   - Images and logos
   - 360° panoramas
   - AR QR markers
   - Trivia and quiz content
4. Publish updates to system

---

# CORE FEATURES

## GPS Geofencing System
- Detects user location in real-time
- Unlocks buildings based on proximity radius
- Uses manual coordinate assignment per building

---

## Building List Map System
Simple list-based map interface:

- CCS ✔ Unlocked  
- Library 🔒 Locked  
- Admin Building 🔒 Locked  

---

## QR-Based AR System
- Users scan QR codes placed on buildings
- Triggers AR content display
- Serves as fallback when image recognition fails

---

## AR Content System
- Displays 3D building models
- Shows educational overlays
- Provides trivia and learning content
- Includes AR selfie feature

---

## 3D Building Visualization
- Lightweight building models
- Used for preview and learning
- Supports rotate and zoom interaction

---

## Trivia and Learning System
- Building-based quizzes
- Educational flashcards
- Non-competitive learning design

---

## AR Selfie Mode
- AR overlays with campus elements
- Mascots or building highlights
- Capture and save images

---

## 360° Virtual Campus Walkthrough (Accreditation Mode)
- Panoramic images per room/location
- Hotspot navigation system
- Simulated walking experience:
  Entrance → Hallway → Laboratory → Office

---

# TECHNOLOGY STACK

## Frontend (Mobile Application)
- React Native
- Camera module (QR scanning)
- Geolocation API (GPS tracking)

## Backend
- Django
- Django REST Framework (DRF)

## Database
- PostgreSQL

## AR Layer
- ARCore (Android)
- QR-based AR trigger system

## 3D & Visualization
- Blender (for building models)
- GLB / GLTF assets

## Accreditation Module
- 360° panorama viewer
- Hotspot navigation system

## Storage / Media Handling
- Django media storage
- Optional cloud storage for large assets

---

# SYSTEM ARCHITECTURE

```text
React Native Mobile App
        ↓
GPS Geofencing Module
        ↓
Building Unlock System (List-Based Map)
        ↓
QR Scanner / AR Module
        ↓
3D Viewer + Trivia System
        ↓
360° Accreditation Module
        ↓
Django REST API Backend
        ↓
PostgreSQL Database

```

# SCOPE

## Included
- GPS-based building unlocking
- QR-based AR interaction system
- 3D building visualization
- Trivia and quiz learning system
- AR selfie feature
- 360° virtual accreditation walkthrough
- Admin content management system

# EXCLUDED (Out of Scope)

- Full VR headset support
- Real-time 3D campus simulation
- Indoor GPS-level accuracy (room-level tracking)
- Unity-based full campus engine
- LiDAR scanning (RoomPlan / Apple ecosystem)
- Multiplayer AR interaction
- AI-generated 3D environments

# KEY DESIGN PRINCIPLE

ARQuest is not a game and not a full VR system.

It is a:

> Location-triggered augmented reality and virtual campus exploration platform designed for education and accreditation support.

# FINAL OUTPUT GOAL

The system aims to provide:

- A guided campus learning experience for students
- A structured virtual campus inspection tool for accreditors
- A centralized content management system for administrators
- A simplified public campus information and exploration system