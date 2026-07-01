# ARQuest — Gamification Build Roadmap

> This file tracks all planned gamification features in priority order.
> Update the status after each feature is completed.
> **Always read this file first before starting a new feature.**

---

## Status Legend
- ✅ **DONE** — Fully implemented and pushed
- 🚧 **IN PROGRESS** — Currently being built
- 🔴 **NEXT** — High priority, build this next
- 🟡 **QUEUED** — Medium priority
- 🟢 **BACKLOG** — Nice to have, build last

---

## ✅ Completed Features

### ✅ 1. Blue Dot on Map
- **What:** GPS auto-starts when opening the map tab. User appears as a blue dot on the Radar Map (buildings tab).
- **Files changed:** `mobile/assets/buildings-map.html`, `mobile/src/app/(tabs)/buildings.js`, `mobile/src/app/(tabs)/index.js`
- **Notes:** Map bounds locked to WMSU campus. Blue dot uses `#4285F4` (Google Maps blue).

### ✅ 2. Achievement / Badge System
- **What:** 10 unlockable badges awarded automatically when conditions are met (building unlocks, quest completions, EXP milestones).
- **Triggers:** GPS geofence unlock → instant toast. QR scan → instant toast. Quest claim → instant toast.
- **Backend:** `Badge` + `UserBadge` models. `check_and_award_badges()` helper. `/api/gamification/badges/` and `/badges/my/` endpoints.
- **Mobile:** `badges.js` screen (3-column grid, progress bar, animated detail modal). Gold toast overlay on Explore + AR tabs. Profile shows `X/10` badge count.
- **Seed data:** 10 default badges via `python manage.py seed_badges`
- **Files changed:** `backend/apps/buildings/models.py`, `gamification_views.py`, `gamification_serializers.py`, `gamification_urls.py`, `views.py`, `admin.py`, `mobile/src/app/badges.js`, `profile.js`, `ar.js`, `explore.js`

---

### ✅ 3. Level / Rank Progression
- **Status:** DONE
- **What:** Replace the flat EXP number with a structured level system. Users have a rank that upgrades as they earn EXP. Profile shows a progress bar toward the next rank.
- **Ranks:**
  | Rank | Title | EXP Required |
  |------|-------|-------------|
  | 1 | Freshman | 0 |
  | 2 | Explorer | 100 |
  | 3 | Scout | 300 |
  | 4 | Ranger | 600 |
  | 5 | Veteran | 1000 |
  | 6 | Campus Legend | 2000 |
- **Backend:** Add `get_rank_info()` helper function (pure calculation, no new model needed). Expose `rank`, `rank_title`, `exp_to_next_rank`, `current_rank_min_exp` in leaderboard + profile API.
- **Mobile:** Profile tab shows rank badge icon + title + EXP progress bar. Home tab shows mini rank chip next to username. Rank-up toast when EXP crosses a threshold.
- **Files to change:** `backend/apps/buildings/gamification_views.py`, `gamification_serializers.py`, `mobile/src/app/(tabs)/profile.js`, `mobile/src/app/(tabs)/index.js`, `mobile/src/app/(tabs)/ar.js`

---

### ✅ 4. Daily Streak System
- **Status:** DONE
- **What:** Track consecutive daily logins. Show a 🔥 streak counter on the Home screen. Award +10 bonus EXP per streak day. Reset streak if user misses a day.
- **Backend:** Added `last_login_date` (DateField) + `streak_count` (IntegerField) fields to `User` model via migration `0003_add_streak_fields`. `update_streak()` method handles increment, same-day no-op, and reset logic. Login view calls it and returns `streak_bonus_exp` in response. `UserSerializer` exposes both fields.
- **Mobile:** Home tab header shows 🔥 orange chip with count next to rank badge. Profile RANK PROGRESS card shows streak row with big flame, day count, and EXP hint. Login screen shows Alert on day 2+ consecutive streak.

---

### ✅ 5. Daily Mission Hero Card
- **Status:** DONE
- **What:** A full-width card at the very top of the Home tab showing today's quest prominently. Includes quest title, target building, reward EXP badge, and a DEPLOY button that jumps to the AR tab.
- **Backend:** No new endpoints — uses existing `/api/gamification/quests/active/`.
- **Mobile:** Replaced old "Target Acquisition" section. Bold WMSU-red hero card placed right below the header. State-aware: shows "STANDBY FOR ORDERS" when no quest is active.
- **Files changed:** `mobile/src/app/(tabs)/index.js`

### ✅ 6. Profile Screen Redesign
- **Status:** DONE
- **What:** Make the profile feel like a real player card. Add EXP progress bar to next rank, quest history list, badge showcase (mini grid of top 6 earned badges with "View All" link).
- **Dependencies:** Requires #3 (Level/Rank) to be done first — already done.
- **Files changed:** `mobile/src/app/(tabs)/profile.js`

### ✅ 7. Campus Stamp Card / Passport
- **Status:** DONE
- **What:** A visual "passport" screen showing all campus buildings as stamp cards. Visited = full color with stamp overlay. Not visited = greyed out silhouette.
- **Backend:** No new endpoints — uses existing `/api/buildings/` + `/api/buildings/unlocked/`.
- **Mobile:** New `passport.js` screen. Accessible from Profile tab. Grid of building cards.
- **Files changed:** New file `mobile/src/app/passport.js`, `mobile/src/app/(tabs)/profile.js`

---

### ✅ 8. Explore Tab Nearby Buildings List
- **Status:** DONE
- **What:** Below the radar animation, show a real-time sorted list of the closest buildings with distance, locked/unlocked status, and a "Navigate" button that opens the map centered on that building.
- **Backend:** No new endpoints needed.
- **Mobile:** Added a buildings list section below the radar in `explore.js`.
- **Files changed:** `mobile/src/app/(tabs)/explore.js`

### ✅ 9. In-app Trivia / Quiz Mode
- **Status:** DONE
- **What:** Tap a building on the Radar Map → a bottom sheet appears with a 3-question multiple choice quiz about that building. Correct answers = +EXP bonus.
- **Backend:** New `/api/buildings/{id}/quiz/` endpoint that returns 3 random trivia facts formatted as questions.
- **Mobile:** Quiz bottom sheet in `buildings.js`. Animated answer reveal (green = correct, red = wrong).
- **Files changed:** `gamification_serializers.py`, `views.py`, `buildings.js`, `QuizModal.js`.

### ✅ 10. Role-Specific Tasks / AR Scavenger Hunts
- **Status:** DONE
- **What:** Unlock role-based quest lines.
- **Backend:** Added `target_role` to `Quest` model. Filtered ActiveQuests API by user role.
- **Mobile:** Unlocked Daily Mission card and Quest log for all roles, not just students.

### ✅ 11. Push Notifications
- **Status:** DONE
- **What:** "New quest available!", "You were overtaken on the leaderboard!", "A building near you!"
- **Tech:** `expo-notifications` on mobile. Backend webhook triggers via Django signals.

### ✅ 12. Audio Feedback
- **Status:** DONE
- **What:** Subtle sound FX: quest claim fanfare, building unlock ping, badge earned chime.
- **Tech:** `expo-av` for lightweight audio playback.

---

### ✅ 13. Timed / Limited Challenges
- **Status:** DONE
- **What:** Weekend-only quests. "Complete 3 buildings before 5PM for 2x EXP." Creates urgency.
- **Backend:** Add `expires_at` field to `Quest` model. New `/api/gamification/challenges/` endpoint.

---

### ✅ 14. Onboarding Tutorial
- **Status:** DONE
- **What:** First-launch walkthrough that highlights each tab with tooltip overlays. Auto-assigns "Your First Quest" on registration.
- **Mobile:** Overlay component with step-by-step highlight boxes. `AsyncStorage` flag to show only once.

---

### ✅ 15. Accreditor Visited / Not Visited Labels
- **Status:** DONE
- **What:** While students use the passport/gamified system, professionals (accreditors) need clear, professional labels indicating which buildings they have "Visited" vs "Not Visited" during their evaluation. Also expose the exact Date and Time when they unlocked/visited a building.
- **Where:** Mobile Explore/Buildings tab and Profile History.

---

### ✅ 16. Admin Reports & Analytics Dashboard
- **Status:** DONE
- **What:** Data visualization for the Admin Web Dashboard to track user engagement.
- **Features:** 
  - Most Visited vs Least Visited buildings bar chart.
  - Total unlock counts per building.
  - Active users and quest completion rates.
- **Where:** React Web Admin Dashboard (Overview page).

---

### ✅ 17. User Feedback & Issue Reporting
- **Status:** DONE
- **What:** Allow users to report bugs, suggest features, or share frustrations directly inside the mobile app.
- **Features:**
  - New `Feedback` backend model.
  - "Report an Issue / Feedback" modal in the mobile app's Profile settings.
  - "Feedback Inbox" page on the Admin Web Dashboard to read and manage these reports.
### ✅ 18. Offline Banner
- **Status:** DONE
- **What:** Add a sleek status bar banner that smoothly drops down when the user's internet connection drops, and hides when it returns.
- **Where:** Mobile root layout `_layout.js` utilizing `@react-native-community/netinfo` and `Animated`.

---

## 🔴 Upcoming Features (Next Priorities)

### 🔴 19. Pull to Refresh 
- **Status:** NEXT
- **What:** Add pull-to-refresh functionality across all pages, tabs, screens, and components to allow users to manually re-sync their data with the backend.

### 🔴 20. App-Wide Massive Redesign
- **Status:** NEXT
- **What:** Completely revamp the UI/UX across all pages to be more modern and premium without changing any underlying logics, functions, or major actions in the system.

### 🔴 21. Remove Native Alerts
- **Status:** NEXT
- **What:** Remove all native `Alert.alert` calls across the entire system and replace them with custom, beautifully styled in-app Modals that match the new design system.
