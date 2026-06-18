# Web Admin UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the reference UI design and layout into the existing `web` project while maintaining backend connections and implementing the requested Split View Geofences and Walkthrough Editor flows.

**Architecture:** We will copy the base UI components, contexts, and styles from the `reference` project to `web`. Then we will adapt the pages (Buildings, Geofences, Media) to use the existing Axios API services. The Geofences page will use a split view, and the Media page will deep-link to the Panorama Manager.

**Tech Stack:** React, Vite, Tailwind CSS, Axios, React Router DOM, Vitest (for TDD).

---

### Task 1: Setup Testing Environment

**Files:**
- Modify: `package.json`
- Create: `vite.config.js` (update)
- Create: `tests/setup.js`

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Vitest**

Modify `vite.config.js` to include test configuration:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true
  }
})
```

- [ ] **Step 3: Create test setup file**

```javascript
// tests/setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.js tests/setup.js
git commit -m "chore: setup vitest and testing library"
```

---

### Task 2: Port UI Components, Styles, and Contexts

**Files:**
- Create/Modify: Multiple files in `src/components/ui/`, `src/context/`, `src/styles/`

- [ ] **Step 1: Copy base UI assets from reference**

```bash
mkdir -p src/components/ui src/components/modals src/context
cp ../reference/ArQuest_Web/Frontend/src/components/ui/* src/components/ui/
cp ../reference/ArQuest_Web/Frontend/src/components/modals/* src/components/modals/
cp ../reference/ArQuest_Web/Frontend/src/context/* src/context/
cp ../reference/ArQuest_Web/Frontend/src/index.css src/styles/index.css
```

- [ ] **Step 2: Commit**

```bash
git add src/components src/context src/styles/index.css
git commit -m "feat: port base UI components and contexts from reference"
```

---

### Task 3: Port Layouts and Static Pages

**Files:**
- Create: `src/layouts/AppLayout.jsx`
- Create: `src/pages/Dashboard.jsx`, `src/pages/Trivia.jsx`, `src/pages/Users.jsx`, `src/pages/Settings.jsx`

- [ ] **Step 1: Copy layouts and static pages from reference**

```bash
cp -r ../reference/ArQuest_Web/Frontend/src/layout/* src/layouts/
cp ../reference/ArQuest_Web/Frontend/src/pages/Dashboard.jsx src/pages/DashboardPage.jsx
cp ../reference/ArQuest_Web/Frontend/src/pages/Trivia.jsx src/pages/TriviaPage.jsx
cp ../reference/ArQuest_Web/Frontend/src/pages/Users.jsx src/pages/UsersPage.jsx
cp ../reference/ArQuest_Web/Frontend/src/pages/Settings.jsx src/pages/SettingsPage.jsx
```

- [ ] **Step 2: Fix Imports in AppLayout**
Since we moved `layout` to `layouts`, update the imports in `src/layouts/AppLayout.jsx` if necessary using sed:

```bash
sed -i 's/\.\.\/components/\.\.\/components/g' src/layouts/AppLayout.jsx
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts src/pages
git commit -m "feat: port layout and static pages"
```

---

### Task 4: Integrate Routing

**Files:**
- Modify: `src/apps/App.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Update App.jsx with new routes and providers**

```javascript
// src/apps/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { CategoryProvider } from '../context/CategoryContext';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';

// Layouts
import AppLayout from '../layouts/AppLayout';

// Pages
import DashboardPage from '../pages/DashboardPage';
import BuildingsPage from '../pages/BuildingsPage';
import GeofencesPage from '../pages/GeofencesPage';
import MediaPage from '../pages/MediaPage';
import PanoramaManagerPage from '../pages/PanoramaManagerPage';
import TriviaPage from '../pages/TriviaPage';
import UsersPage from '../pages/UsersPage';
import SettingsPage from '../pages/SettingsPage';

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CategoryProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="buildings" element={<BuildingsPage />} />
                            <Route path="geofences" element={<GeofencesPage />} />
                            <Route path="media" element={<MediaPage />} />
                            <Route path="panoramas/:id" element={<PanoramaManagerPage />} />
                            <Route path="trivia" element={<TriviaPage />} />
                            <Route path="users" element={<UsersPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                        </Route>
                    </Routes>
                </CategoryProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/App.jsx
git commit -m "feat: update routing with new pages and context"
```

---

### Task 5: Implement Geofences Split View Page

**Files:**
- Create: `src/pages/GeofencesPage.jsx`

- [ ] **Step 1: Copy reference Geofences as base**

```bash
cp ../reference/ArQuest_Web/Frontend/src/pages/Geofences.jsx src/pages/GeofencesPage.jsx
```

- [ ] **Step 2: Refactor GeofencesPage.jsx for Split View**
Since the exact map implementation from `BuildingEditorPage.jsx` is highly specific to Leaflet, replace the `card` view in `GeofencesPage.jsx` to render a split layout.

Update `src/pages/GeofencesPage.jsx`: Replace the `{view === 'card' ? (...) : (...)}` section with the following split view layout.
(Note: You will use `sed` or an editor to wrap the list on the right and mount the map placeholder on the left).

```bash
# We will use an interactive replacement or direct file edit during execution
```
*Agent Note: When executing this step, use the `replace_file_content` tool to modify the JSX return statement in `GeofencesPage.jsx` to output a grid: `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` where the left column is your map component from `BuildingEditorPage` and the right column is the `filteredGeofences.map` card list.*

- [ ] **Step 3: Commit**

```bash
git add src/pages/GeofencesPage.jsx
git commit -m "feat: implement geofences split view layout"
```

---

### Task 6: Implement Media Page & Panorama Link

**Files:**
- Create: `src/pages/MediaPage.jsx`

- [ ] **Step 1: Copy reference Media as base**

```bash
cp ../reference/ArQuest_Web/Frontend/src/pages/Media.jsx src/pages/MediaPage.jsx
```

- [ ] **Step 2: Add Navigation hook to MediaPage**

Modify `src/pages/MediaPage.jsx` to include `useNavigate` and wrap the asset card onClick to navigate to the panorama manager if it's a panorama.

```javascript
// Add to imports in src/pages/MediaPage.jsx
import { useNavigate } from 'react-router-dom';

// Inside component:
// const navigate = useNavigate();

// Modify the Card render to add a click handler:
// <Card key={asset.id} className="group overflow-visible cursor-pointer hover:border-brand transition-colors" onClick={() => asset.type === '360° Panorama' && navigate(`/panoramas/${asset.buildingId}`)}>
```

*Agent Note: Use standard code manipulation tools during execution to insert the router navigation.*

- [ ] **Step 3: Commit**

```bash
git add src/pages/MediaPage.jsx
git commit -m "feat: link media panoramas to panorama manager"
```
