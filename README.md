# ARQuest: A Sensor-Assisted Campus Exploration and Accreditation Support System with GPS Geofencing, 3D Building Visualization, QR-Based Optional Verification, and 360° Virtual Walkthroughs

---

# PROJECT OVERVIEW

ARQuest is a mobile-based campus exploration and accreditation support system designed to enhance spatial learning, navigation, and institutional evaluation through location-aware and visual technologies.

The system integrates GPS geofencing, 3D building visualization, QR-based optional interaction, and 360° panoramic walkthroughs into a unified Android-compatible application built using React Native (Expo) with a Django REST backend.

It supports four user roles: Admin, Students, Professionals (Accreditors/Personnel), and Visitors.

---

# 1. WHAT THE SYSTEM DOES

ARQuest transforms a physical campus into a digitally interactive environment.

It allows users to:

- Automatically unlock buildings based on GPS geofencing
- Access 3D building models when inside a campus zone
- View building information, trivia, and learning content
- Explore campus through an interactive list-based system
- Use QR codes as optional verification or bonus interaction
- Access 360° virtual walkthroughs for accreditation and evaluation
- Allow administrators to manage campus content dynamically

The system focuses on location-triggered visualization rather than full AR world tracking.

---

# 2. USERS AND THEIR NEEDS

## Students
- Need guided and engaging campus exploration
- Need automatic building discovery through location
- Need visual understanding of campus structures via 3D models
- Need trivia and learning reinforcement

## Professionals (Accreditors / Personnel)
- Need remote or assisted facility evaluation
- Need structured 360° walkthroughs per building
- Need organized documentation per department

## Admins
- Need to manage campus data (buildings, coordinates, content)
- Need to upload images, 360° panoramas, and 3D models
- Need to configure geofence zones
- Need control over system content updates

## Visitors
- Need simplified campus information access
- Need visual and location-based navigation support

---

# 3. CORE USER FLOWS

## Student Flow

1. Open ARQuest mobile application
2. System continuously detects GPS location
3. User enters a predefined campus zone (e.g., CCS building)
4. System automatically unlocks the building
5. 3D model becomes available for interaction
6. User accesses:
   - building information
   - trivia and quizzes
   - learning content
7. Optional QR scan provides bonus or verification content
8. Progress is stored in the system

---

## Accreditor Flow

1. Open Accreditation Mode
2. Select a building
3. Access 360° virtual walkthrough
4. Navigate hotspot-based views (Entrance → Hallway → Rooms → Offices)
5. Review building documentation and multimedia content
6. Proceed to other campus areas for evaluation

---

## Admin Flow

1. Login to admin dashboard
2. Create or update building entry
3. Input:
   - GPS coordinates (geofence definition)
   - building information
   - trivia and quizzes
   - 360° images
   - pre-created 3D model files
4. Upload photos and media assets
5. Publish updates to the mobile system

---

# 4. CORE FEATURES

## GPS Geofencing System (PRIMARY TRIGGER)

- Detects user location in real time
- Defines campus zones per building
- Automatically unlocks buildings when user enters a zone
- Serves as the main trigger for content access

---

## Building List System

A simplified campus map interface:

- CCS ✔ Unlocked
- Library 🔒 Locked
- Admin Building 🔒 Locked

Buildings unlock dynamically based on GPS detection.

---

## 3D Building Visualization System

- Displays pre-created building models
- Accessible after geofence unlock
- Supports rotation, zoom, and inspection
- Provides spatial understanding of campus layout

---

## QR-Based Optional Verification System

- QR scanning is NOT required for access
- Used for:
  - optional verification of physical presence
  - bonus content unlocking
  - fallback interaction method if GPS is inaccurate

---

## Trivia and Learning System

- Building-based quizzes and flashcards
- Provides contextual learning per location
- Enhances student engagement and retention

---

## AR-Style Visualization Layer (Camera-Based UI)

- Camera interface used for immersive presentation
- Displays overlays, 3D previews, and UI panels
- Does NOT implement full ARCore world tracking
- Focuses on visual augmentation through interface layers

---

## AR Selfie Feature

- Users can take photos with overlays and frames
- Includes building-themed visuals and campus branding
- Enhances engagement and user interaction

---

## 360° Virtual Walkthrough System (Accreditation Mode)

- Panorama-based virtual navigation
- Hotspot transitions between areas
- Simulated walkthrough of real campus spaces:
  Entrance → Hallway → Classroom → Office

---

# 5. TECHNOLOGY STACK

## Mobile Application
- React Native (Expo Managed Workflow)
- Expo Location API (GPS and geofencing)
- Expo Camera API (QR scanning and camera usage)
- WebView (3D and 360° rendering support)

## Backend
- Django
- Django REST Framework (DRF)

## Database
- PostgreSQL

## 3D Modeling
- SketchUp (Primary tool for building modeling)
- Blender (Optional for conversion and optimization)
- GLB / GLTF format for mobile rendering

## Visualization
- Three.js (for 3D rendering in WebView)
- A-Frame (optional for 3D scenes)

## Mapping System
- GPS Geolocation Services
- Geofencing logic (client + backend validation)

## Media Storage
- Django media storage system
- Optional cloud storage for large assets

---

# 6. SYSTEM ARCHITECTURE

```text
React Native (Expo App)
        ↓
GPS Geofencing Engine
        ↓
Building Unlock System
        ↓
3D Visualization Module (WebView / Renderer)
        ↓
Optional QR Verification Layer
        ↓
Trivia & Learning System
        ↓
360° Accreditation Module
        ↓
Django REST API
        ↓
PostgreSQL Database

```

# SCOPE

The system focuses on a mobile-based campus exploration and accreditation support platform that integrates GPS geofencing, 3D visualization, and 360° virtual walkthroughs.

It covers location-based learning, building-level content unlocking, and administrative content management for campus information systems.

# INCLUDED

- GPS-based automatic building unlocking (geofencing)
- 3D building visualization per campus location
- Trivia and flashcard learning system
- AR-style camera-based UI experience (non-ARCore)
- Optional QR-based verification and bonus interaction system
- 360° virtual accreditation walkthrough system
- Admin dashboard for managing buildings, media, and content

# EXCLUDED (OUT OF SCOPE)

- Full ARCore world-anchored augmented reality (real-time spatial tracking)
- Indoor centimeter-level positioning systems
- Unity-based immersive VR headset simulation
- Real-time multiplayer AR interaction between users
- LiDAR / RoomPlan-based automatic 3D reconstruction
- AI-generated 3D models from uploaded images
- Fully simulated real-time 3D campus environment engine

# KEY DESIGN PRINCIPLE

ARQuest is a location-triggered campus exploration and accreditation support system.

GPS geofencing is the primary mechanism for unlocking campus content. Once a user enters a defined zone, building information and 3D visualization become immediately available.

QR codes are optional and serve only as verification or enhancement tools.

The system is designed with the following principles:

- Feasibility on standard Android devices using Expo React Native
- Lightweight and deployable architecture
- Location-based learning over full AR world tracking
- Use of pre-created 3D models and 360° media for visualization

# FINAL OUTPUT GOAL

The system aims to provide:

- A GPS-driven interactive campus exploration experience for students
- A 3D visualization-based learning system for understanding campus structures
- A structured 360° virtual walkthrough system for accreditation and evaluation
- A centralized admin-controlled platform for managing campus content
- A deployable Android application that supports location-based learning and virtual campus inspection