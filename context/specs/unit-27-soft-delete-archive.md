# Unit 27: Soft Delete & Archive System Design

## 1. Overview
This unit implements a "Soft Delete" architecture for the ARQuest system. Instead of permanently deleting buildings and their related gamification content immediately, they are moved to an "Archive". Items in the archive remain invisible to the active system (APIs, Mobile App) for 30 days before being permanently destroyed via an automated cron job.

## 2. Backend Architecture
- **`SoftDeleteModel`**: A new abstract Django model in a shared location (e.g., `backend/apps/core/models.py` or within `buildings/models.py`).
    - Fields: `deleted_at` (DateTimeField, null=True, blank=True).
    - Manager: Overrides the default `objects` manager to exclude any records where `deleted_at__isnull=False`. Provides an `all_with_deleted()` manager to fetch everything.
    - Delete Override: The `delete()` method will be overridden to set `deleted_at = timezone.now()` instead of issuing a SQL DELETE. It will also cascade this soft-delete timestamp down to related Geofences, Quests, and Trivias.
    - Restore Method: A new `restore()` method to set `deleted_at = None` on the model and its related content.
- **Target Models**: `Building`, `Geofence`, `Quest`, and `Trivia` will inherit from `SoftDeleteModel`.

## 3. Cron Job Endpoint (cron-job.org)
- **Endpoint**: `DELETE /api/buildings/cron/cleanup/`
- **Security**: 
    - Requires a custom HTTP Header: `X-Cron-Secret`.
    - Compares the header value against `settings.CRON_SECRET_KEY` (loaded from `.env`).
    - If it fails, returns 403 Forbidden.
- **Logic**: 
    - Queries the database using the `all_with_deleted()` manager for objects where `deleted_at < timezone.now() - timedelta(days=30)`.
    - Issues a hard delete (`hard_delete()`) on these records.

## 4. Admin Web UI Updates
- **Sidebar Navigation**: Add an "Archives" link near the bottom of the sidebar.
- **Archive Page (`web/src/pages/ArchivePage.jsx`)**:
    - Displays a list of all soft-deleted buildings.
    - Two actions per building: "Restore" and "Delete Permanently".
- **Global Delete Buttons**: 
    - Across the app (e.g., Building Editor, Geofences page), standard "Delete" buttons will be relabeled to "Move to Archive".
    - Delete warning modals will clarify that the item is moved to the archive for 30 days, rather than immediately destroyed.

## 5. Mobile App Impact
None explicitly required. Because the backend manager naturally filters out any object with `deleted_at`, the mobile app will automatically stop receiving data for archived buildings, quests, and geofences.
