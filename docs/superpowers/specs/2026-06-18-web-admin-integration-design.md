# Web Admin UI Integration & Architecture Spec

## 1. Overview
The goal of this project is to integrate the modern, beautiful UI design and new features from the `reference` frontend into the existing `web` admin portal. The `web` portal will remain the primary application to preserve existing backend connectivity (Django REST Framework) and authentication flows. 

## 2. Architecture & Data Flow
- **Base Application**: The existing `web` project.
- **UI Fraewmork**: React + Vite + Tailwind CSS.
- **Icons**: Lucide React.
- **Data Fetching**: Existing Axios setup (`services/api.js`). Static dummy data from the reference designs (e.g., `INITIAL_BUILDINGS`, `GEOFENCES`) will be entirely removed and replaced with dynamic API calls to the Django backend.

## 3. Core Pages & Layouts

### 3.1 Global Navigation
- The sidebar will be updated to match the reference design, including links to: Dashboard, Buildings, Geofences, Media, Trivia, Users, and Settings.

### 3.2 Geofences Page (Split View)
- **Layout**: A side-by-side split screen.
- **Left Panel (Interactive Map)**: Integrates the existing Map Editor. Displays the campus map with red markers and visual radius circles for all geofences.
- **Right Panel (Details & List)**: Displays the styled list/cards of geofences from the reference design.
- **Interaction**: Clicking a marker on the map highlights the corresponding geofence details on the right panel, allowing admins to view and edit coordinates and radius directly without a separate modal.

### 3.3 Media & Panorama Manager
- **Main View (File Manager)**: A grid/list layout displaying all uploaded 3D models and 360° panoramas with their respective buildings, statuses, and file sizes. Includes functionality to upload new assets.
- **Walkthrough Editor Integration**: Clicking on a 360° panorama asset (or a specific "Manage Walkthrough" action) will transition the user seamlessly to the advanced 3-column `PanoramaManagerPage` (Scenes, Preview, Hotspots) to build and link the virtual tour.

### 3.4 Additional Pages
- **Buildings, Trivia, Users, Settings, Dashboard**: UI layouts will be ported from the reference design. API service files will be created/updated to handle standard CRUD operations for these entities.

## 4. Testing & Error Handling
- All new API calls will utilize the existing Axios interceptors for standard error handling and token refresh flows.
- Visual components will be tested to ensure they break down gracefully on smaller admin screens (responsive design).
