# Admin Dashboard Notifications Design Specification

## Overview
Implement a notification system for the ARQuest Admin Dashboard that captures both Student Activity and System Alerts. Notifications will be displayed via a slide-out drawer in the UI and updated seamlessly through background polling.

## Architecture

### 1. Database (Backend)
- **Model:** `Notification`
- **Location:** `backend/apps/core/models.py`
- **Fields:**
  - `title` (CharField, max_length=255)
  - `message` (TextField)
  - `type` (CharField, choices: `STUDENT`, `SYSTEM`)
  - `is_read` (BooleanField, default=False)
  - `created_at` (DateTimeField, auto_now_add=True)

### 2. API (Backend)
- **Location:** `backend/apps/core/views.py` (or a dedicated `notifications` endpoint).
- **Endpoints:**
  - `GET /api/notifications/`: Returns the latest 50 notifications, sorted by `-created_at`.
  - `POST /api/notifications/{id}/read/`: Marks a specific notification as `is_read=True`.
  - `POST /api/notifications/read_all/`: Marks all notifications for the admin as `is_read=True`.

### 3. UI Implementation (Frontend)
- **Location:** `web/src/components/common/Header.jsx`
- **Trigger:** A Bell icon next to the user email. Displays a red badge if there are unread notifications.
- **Drawer Component:** Clicking the bell toggles a sliding side-panel (drawer).
- **Content:**
  - A header with "Notifications" and a "Mark all as read" button.
  - A scrollable list of notification cards.
  - Distinct icons/colors based on notification `type` (e.g., Blue for `STUDENT`, Red/Orange for `SYSTEM`).
  - Unread items will have a subtle background highlight.

### 4. Background Synchronization
- **Mechanism:** Polling.
- **Implementation:** React `useEffect` inside `Header.jsx` with a `setInterval` that calls the `GET /api/notifications/` endpoint every 30 seconds.

## Scope & Next Steps
This specification covers the creation of the system, the endpoints, and the UI. Actually triggering notifications (e.g., wiring it up to signals when a student registers) will be handled in subsequent units or testing scripts once the foundation is laid.
