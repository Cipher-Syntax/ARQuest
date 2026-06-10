# ARQuest: A Sensor-Assisted Augmented Reality Campus Exploration and Accreditation Support System with GPS Geofencing, 3D Building Visualization, QR-Based Optional Verification, and 360° Virtual Campus Walkthrough

---

# PROJECT OVERVIEW

ARQuest is a role-based smart campus exploration and accreditation support system designed to enhance campus orientation, learning engagement, and facility evaluation through mobile-based technologies.

The system integrates GPS geofencing, 3D building visualization, QR-based optional interaction, and 360° panoramic walkthroughs into a unified mobile platform built for Android using React Native (Expo), supported by a Django REST backend.

It supports four user roles: Students, Professionals (Accreditors/Personnel), Admins, and Visitors.

---

# WHAT THE SYSTEM ACTUALLY DOES

ARQuest transforms a physical campus into a digitally enhanced interactive environment.

It allows users to:

- Automatically unlock campus buildings based on GPS geofencing
- View 3D building models once inside a defined campus zone
- Access building-specific trivia and educational content
- Explore campus information through an interactive list-based system
- Perform optional QR scanning for verification or bonus interactions
- Access 360° virtual walkthroughs for accreditation and remote evaluation
- Allow admins to manage buildings, coordinates, and content dynamically

The system focuses on location-triggered learning and visualization rather than full immersive AR tracking.

---

# USERS AND THEIR NEEDS

## Students
- Need guided and engaging campus exploration
- Need automatic discovery of buildings based on location
- Need visual understanding of campus structures via 3D models
- Need lightweight quizzes and informational content

## Professionals (Accreditors / Personnel)
- Need remote or guided evaluation of campus facilities
- Need structured 360° walkthroughs for inspection
- Need organized building documentation per department

## Admins
- Need to manage campus data (buildings, coordinates, media, quizzes)
- Need to upload and update 3D models and panoramic content
- Need control over system content and geofence configurations

## Visitors
- Need simplified access to campus information
- Need overview of buildings and basic navigation support

---

# CORE USER FLOWS

## Student Flow

1. Open ARQuest mobile application
2. System continuously checks GPS location
3. User enters a defined campus geofence (e.g., CCS building)
4. Building is automatically unlocked in the system
5. 3D building model becomes available for viewing
6. User explores:
   - building information
   - trivia questions
   - educational content
7. Optional QR scan provides bonus or verification content
8. User activity is recorded for progress tracking

---

## Accreditor Flow

1. Open Accreditation Mode
2. Select a building from the system
3. Access 360° virtual walkthrough
4. Navigate through hotspot-based views (Entrance → Hallway → Rooms)
5. Review facility documentation and multimedia content
6. Proceed to other buildings for evaluation

---

## Admin Flow

1. Login to admin dashboard
2. Create or update building entry
3. Input:
   - GPS coordinates (geofence zones)
   - building metadata
   - trivia and quiz content
   - 3D model assets
   - 360° images
4. Publish updates to mobile system
5. Monitor usage and content engagement

---

# CORE FEATURES

## GPS Geofencing System (PRIMARY TRIGGER)
- Detects user location in real time
- Defines campus zones per building
- Automatically unlocks building content when user enters zone
- Serves as the main system trigger for exploration

---

## Building List Map System
A simplified, non-map interface:

- CCS ✔ Unlocked  
- Library 🔒 Locked  
- Admin Building 🔒 Locked  

Buildings transition from locked to unlocked based on GPS detection.

---

## 3D Building Visualization System
- Displays lightweight 3D models of campus buildings
- Automatically available upon geofence unlock
- Supports rotation, zoom, and interactive viewing
- Serves as the main visual learning component

---

## QR-Based Optional Verification System
- QR scanning is NOT required for access
- Used for:
  - optional verification of physical presence
  - bonus content unlocking
  - fallback interaction method in case of GPS inconsistency

---

## Trivia and Learning System
- Building-based quizzes and flashcards
- Provides contextual learning per location
- Reinforces campus familiarity and knowledge retention

---

## AR-Style Interaction Layer (UI-Based)
- Camera-based interface for immersive presentation
- Displays overlays such as:
  - building info panels
  - 3D model viewer integration
  - interactive UI elements
- Does not rely on full ARCore world tracking

---

## AR Selfie Mode
- Users can take photos with AR-styled overlays
- Includes building frames, icons, or mascots
- Enhances engagement and interaction experience

---

## 360° Virtual Campus Walkthrough (Accreditation Mode)
- Panoramic image-based facility navigation
- Hotspot system for room-to-room exploration
- Simulated walkthrough of real campus spaces:
  Entrance → Hallway → Laboratory → Office

---

# TECHNOLOGY STACK

## Frontend (Mobile Application)
- React Native (Expo Managed Workflow)
- Expo Camera API (QR scanning and camera usage)
- Expo Location API (GPS tracking and geofencing)
- WebView (for 3D or 360° rendering modules if needed)

## Backend
- Django
- Django REST Framework (DRF)

## Database
- PostgreSQL

## Visualization & AR-Like Layer
- Three.js (for 3D rendering inside WebView)
- A-Frame (optional for Web-based 3D scenes)
- GLB / GLTF 3D model assets

## Mapping & Location System
- GPS Geolocation Services
- Geofencing logic (client + backend validation)

## Accreditation Module
- 360° panorama viewer system
- Hotspot-based navigation logic

## Storage / Media Handling
- Django media storage system
- Optional cloud storage for:
  - 3D models
  - 360° images
  - QR assets

---

# SYSTEM ARCHITECTURE

```text
React Native (Expo) Mobile App
        ↓
GPS Geofencing Engine (Location Detection)
        ↓
Building Unlock System (List-Based Map)
        ↓
3D Visualization Module (WebView / Native Rendering)
        ↓
Optional QR Verification Module
        ↓
Trivia + Learning System
        ↓
360° Accreditation Module
        ↓
Django REST API Backend
        ↓
PostgreSQL Database

```

# SCOPE

## Included
- GPS-based automatic building unlocking
- 3D building visualization per location
- Trivia and flashcard learning system
- AR-style UI interaction layer (camera-based experience)
- Optional QR-based verification system
- 360° virtual accreditation walkthrough
- Admin content management system

# EXCLUDED (OUT OF SCOPE)

- Full ARCore world-anchored augmented reality (real-time spatial tracking in 3D space)
- Indoor centimeter-level positioning or precise indoor navigation systems
- Real-time 3D campus simulation engine (fully interactive virtual world)
- Unity-based immersive VR headset experience
- LiDAR / RoomPlan scanning for automatic 3D environment generation
- Multiplayer real-time AR interactions between users
- AI-generated 3D models or procedural campus generation

# KEY DESIGN PRINCIPLE

ARQuest is a location-triggered digital campus exploration and accreditation support system.

It uses GPS geofencing as the primary trigger for unlocking campus content. Once a user enters a defined zone, 3D building visualization and learning content become available automatically.

QR codes are used only as optional verification and enhancement, not as a requirement for accessing core features.

The system prioritizes:
- Feasibility on standard Android devices
- Low-complexity deployment using Expo React Native
- Location-driven learning over full AR world tracking
- Lightweight 3D and 360° visualization instead of immersive VR

# FINAL OUTPUT GOAL

The system aims to provide:

- A GPS-driven interactive campus exploration experience for students
- A 3D visualization-based learning tool for understanding campus structures
- A structured 360° virtual walkthrough system for accreditation and evaluation
- A centralized admin-controlled platform for campus content management
- A lightweight and deployable mobile system compatible with standard Android devices