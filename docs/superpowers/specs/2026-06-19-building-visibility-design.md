# Building Visibility & Inactive State Design

## Overview
Currently, buildings are controlled by a single `is_active` toggle. When a building is marked inactive, the backend entirely filters it out of API responses. This prevents admins from displaying a building as "Under Renovation" or "Closed" to students in the mobile app, because the building completely disappears from the map.

This design introduces a two-tier status system:
1. **Visibility (`is_visible`)**: Controls if the building exists in the API for users at all. Used to completely hide draft or test buildings.
2. **Active Status (`is_active`)**: Controls if a visible building is open (active) or closed/under renovation (inactive). Inactive buildings are visible but grayed out and inaccessible.

## 1. Backend Architecture (Django)
* **Model Update**: Add `is_visible = models.BooleanField(default=True)` to the `Building` model.
* **Migrations**: Generate and apply the Django database migration.
* **API Filtering (`building_list_create`)**:
  * Currently: `Building.objects.filter(is_active=True)`
  * New: `Building.objects.filter(is_visible=True)`
* **Unlock & Geofencing Validation**: Keep existing checks ensuring `is_active=True` for geofence unlocking, so inactive buildings cannot be unlocked or interacted with.

## 2. Web Admin Dashboard (React)
* **Building Editor (`BuildingEditorPage.jsx`)**: Add a new checkbox for `is_visible` ("Visible in App") alongside the existing `is_active` ("Active / Open") checkbox.
* **Buildings Table (`BuildingsPage.jsx`)**: Update the table columns to display both "Visible" and "Active" badges, so admins can quickly see the exact status of every building.

## 3. Mobile App (React Native)
* **Buildings Tab (`app/(tabs)/buildings.js`)**:
  * If `building.is_active === false`, apply a 50% opacity to the building card.
  * Render an `[INACTIVE]` or `[RENOVATION]` badge next to the building name.
  * Disable the "View 3D Model" and "360 Walkthrough" buttons for inactive buildings, even if the user had previously unlocked them.
* **Explore Map / Geofencing**:
  * If the user is near an inactive building, the geofencing HUD should indicate that the building is closed and disable the "Claim Points / Unlock" features.

## Edge Cases & Ambiguities Resolved
* *What happens if a student previously unlocked a building, but the admin makes it inactive?* The building will still appear in their unlocked list (since it's visible), but the interaction buttons will be disabled and it will be grayed out.
* *Who can see invisible buildings?* Only admins can see `is_visible=False` buildings via the admin dashboard. Mobile API requests from students will not receive invisible buildings.
