# Building Draft Status Design

## Overview
This feature replaces the binary `is_visible` toggle with a robust `status` field, allowing admins to save incomplete building entries as "Drafts" without providing typically mandatory fields like coordinates or slugs.

## 1. Database Model (`backend/apps/buildings/models.py`)
* Remove the `is_visible` boolean field.
* Add a `status` CharField with `choices=[('DRAFT', 'Draft'), ('HIDDEN', 'Hidden'), ('VISIBLE', 'Visible')]`. Default is `'DRAFT'`.
* Update `latitude` and `longitude` fields to include `null=True, blank=True`.
* **Validation**: Add a `clean()` method to the model. If `status` is `'HIDDEN'` or `'VISIBLE'`, `latitude`, `longitude`, and `slug` must not be null/blank. Raise `ValidationError` if they are missing.

## 2. API & Views (`backend/apps/buildings/views.py` & `serializers.py`)
* **Serialization**:
  * Update `BuildingSerializer` and `BuildingWriteSerializer` to include the `status` field instead of `is_visible`.
  * Ensure `latitude` and `longitude` are not marked as strictly required in the serializer if the status is `DRAFT`.
* **Filtering (`views.py`)**:
  * Update `building_list_create` and `building_detail`. For users without admin/professional roles, filter queries by `status='VISIBLE'` instead of `is_visible=True`.
  * Geofencing validation should also filter by `status='VISIBLE'`.

## 3. Web Admin Dashboard (`web/src/pages/`)
* **`BuildingEditorPage.jsx`**:
  * Replace the `is_visible` checkbox with a `<select>` or equivalent Dropdown component for `status`.
  * Make coordinate fields and slug fields non-required on the frontend if `status === 'DRAFT'`.
* **`BuildingsPage.jsx`**:
  * Replace the "Visibility" column with a "Status" column.
  * Render badges indicating status: Gray for DRAFT, Yellow for HIDDEN, Green for VISIBLE.

## Migration Strategy
* We will need to create a data migration to map existing `is_visible=True` buildings to `status='VISIBLE'`, and `is_visible=False` to `status='HIDDEN'`.

## Ambiguities & Edge Cases
* **Geofence constraints**: Geofences attached to a Draft building should be ignored by the engine. This is handled by ensuring the mobile app never receives DRAFT buildings, and the geofence engine only checks VISIBLE buildings.
* **3D Models**: A building in Draft mode can still have a 3D model uploaded; it just won't be exposed to the mobile app until published.
