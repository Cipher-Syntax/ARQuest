# ARQuest Admin Web Dashboard

Admin web dashboard for managing ARQuest campus buildings, geofences, and media metadata.

## Features

- Admin authentication with role-based access control
- Building management (CRUD operations)
- Geofence editor with interactive map (Leaflet)
- Visual geofence configuration with radius control
- Media metadata management (3D models)
- Dashboard overview with statistics

## Tech Stack

- React 19
- Vite
- React Router DOM
- Axios with interceptors
- Leaflet & React-Leaflet for maps
- lucide-react for icons

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
Create or update `.env` file:
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

3. Run development server:
```bash
npm run dev
```

## Usage

### Login
- Only admin users can access the dashboard
- Use your admin credentials from the backend

### Buildings Management
- View all buildings in a table
- Create new buildings with coordinates
- Edit building information
- Delete buildings
- Toggle active/inactive status

### Geofence Configuration
- Click on map to set geofence center
- Adjust radius in meters
- Visual feedback with circle overlay
- Map restricted to WMSU campus bounds
- Save geofence configuration per building

### 3D Model Metadata
- Manage 3D model version information
- Toggle model active status
- Note: Actual file upload depends on media storage strategy

## API Integration

All API calls use axios with interceptors for:
- Automatic JWT token attachment
- Token refresh on 401 errors
- Automatic redirect to login on auth failure

Use `api.get()`, `api.post()`, `api.patch()`, `api.delete()` from `services/api.js` for all backend calls.

## Architecture

```
src/
├── apps/           # App entry and routing
├── components/     # Reusable components
├── hooks/          # Custom hooks (useAuth)
├── layouts/        # Layout components
├── pages/          # Page components
├── services/       # API services
├── theme/          # Theme configuration
└── utils/          # Utilities
```

## Protected Routes

All dashboard routes require:
1. Valid JWT token
2. Admin role

Non-admin users are blocked with access denied message.
