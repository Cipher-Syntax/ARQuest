# Two-Way Map Sync Design Specification

## Overview
Currently, the `GeofenceEditor` allows admins to click on the map to set a building's coordinates (latitude and longitude). However, manually typing coordinates into the text inputs does not update the map's visual center. This feature will introduce a two-way synchronization, ensuring that typing coordinates smoothly pans the map to the new location.

## Approach
We will implement "Live Synchronization with Smooth Panning (Debounced)".

## Components

### 1. `MapUpdater` Component
A new child component inside the `MapContainer` in `GeofenceEditor.jsx`.
- **Purpose:** To listen to prop changes for `center.lat` and `center.lng` and imperatively update the Leaflet map view.
- **Hook:** Uses `useMap()` from `react-leaflet` to gain access to the raw Leaflet map instance.

### 2. Debounce Logic
- **Mechanism:** Inside `MapUpdater`, a `useEffect` hook will depend on `center.lat` and `center.lng`.
- **Timer:** When coordinates change, a `setTimeout` of 500ms is triggered. If the coordinates change again before 500ms, the previous timeout is cleared.
- **Execution:** Once the timeout completes, the system validates the coordinates.

### 3. Validation and Panning
- **Validation:** Ensures `lat` and `lng` are valid floats, not `NaN`, and not empty strings.
- **Bounds Check:** (Optional but recommended) ensures the coordinates loosely fit within the campus bounds to prevent flying off into the ocean if a typo occurs.
- **Action:** Calls `map.flyTo([lat, lng], 18, { duration: 0.5 })` to smoothly sweep the camera to the target coordinates.

## File Modifications
- **`web/src/components/GeofenceEditor.jsx`**:
  - Import `useEffect` and `useMap` from React and `react-leaflet`.
  - Create the `MapUpdater` component.
  - Insert `<MapUpdater center={center} />` inside the `<MapContainer>`.

## Error Handling
- Invalid manual inputs (e.g., typing `-` or `122.`) will be ignored by the debouncer until they resolve to a valid `parseFloat`.
- Out-of-bounds inputs will be clamped or ignored to prevent Leaflet from crashing or getting stuck outside `maxBounds`.

## Testing
- Verify that clicking the map still updates the input fields.
- Verify that typing into the input fields waits 500ms, then smoothly pans the map.
- Verify that typing an invalid coordinate does not crash the map.
