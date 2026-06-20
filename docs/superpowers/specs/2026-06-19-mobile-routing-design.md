# Mobile Map Search and Routing Design

## Overview
This design implements a routing search UI overlay on top of the Mobile Buildings Map. It allows users to search for a specific building and instantly visualize a straight-line route from their current physical location to the target building, providing situational awareness and distance visualization.

## 1. Mobile UI (`buildings.js`)
* **Routing HUD Interface**: 
  * Replace or overlay the current `hudTopBar` with a routing panel containing two inputs:
    1. **From**: A read-only field styled to look like an input, reading "Your Location" with a tracking/GPS icon.
    2. **To**: A text input field for searching buildings.
* **Search Mechanics**:
  * As the user types in the "To" field, an absolute-positioned dropdown will filter `allBuildings` by name and slug.
  * Tapping a building from the dropdown will:
    1. Set it as the `targetBuilding` state.
    2. Send a `draw_route` message to the WebView.
    3. Trigger the bottom sheet modal for the selected building (same behavior as tapping the marker).
* **Clear Route**: Add an 'X' button inside the "To" field when a target is active, allowing users to clear the route line and the search input.

## 2. WebView Map Integration (`buildings-map.html`)
* **Message Handling**:
  * Add support for a new `draw_route` message that accepts a `targetBuildingId`.
  * Add support for a `clear_route` message.
* **Routing Visualization**:
  * When `draw_route` is received:
    1. Look up the marker coordinates for `targetBuildingId`.
    2. Use `L.polyline([userLatLng, targetLatLng], { dashArray: '8, 8', color: '#B21830', weight: 3 })` to draw a dashed line.
    3. Adjust the map's bounds using `map.fitBounds()` to ensure both the user marker and the destination marker are visible simultaneously.
* **Continuous Updates**:
  * When `userLocation` updates (via the normal `update` message), the drawn polyline must recalculate its origin so the line follows the user as they walk.

## Ambiguities and Edge Cases
* **Missing GPS**: If the user hasn't granted GPS permissions or hasn't acquired a lock, the "From" field should indicate "Acquiring GPS..." and drawing the line should be deferred until a location is available.
* **Performance**: Re-drawing the line on every 5-second GPS tick is lightweight enough for Leaflet and will not cause performance issues.
