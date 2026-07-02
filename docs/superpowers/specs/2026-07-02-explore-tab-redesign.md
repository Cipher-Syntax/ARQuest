# Explore Tab UI Redesign

## 1. Overview
The goal of this redesign is to overhaul the Explore Tab (`explore.js`) to match the "Gamified Crimson + White" visual aesthetic established in the Home and Profile tabs. This involves replacing standard components with stylized HUD (Heads-Up Display) elements to make the map interface feel like a tactical navigation system.

## 2. Core Architecture & Base Map
- **Component:** We continue to use `react-native-maps` for rendering.
- **Style:** The base map tiles will retain the standard "Light Mode" Google Maps aesthetic (to preserve real-world visual familiarity).
- **Gamified Routing:** Active navigation polylines on the map will be styled with a thick, glowing Crimson stroke (`#B21830`) to sharply contrast with the light map.
- **Custom Markers:** Building map markers will be updated to use Crimson/Dark Grey HUD themes depending on their Locked/Unlocked state.

## 3. Search & Routing Overlay (Cyberpunk Side Terminal)
- **Concept:** A top-anchored HUD data feed overlay that replaces standard white search bars.
- **Visuals:** 
  - An edge-to-edge dark gradient overlay fading from solid black/dark-grey at the top down to transparent.
  - Features a monospace system header: `[ NAV_SYS // ONLINE ]` in Crimson.
- **Inputs:** The Origin and Destination search inputs are styled as raw terminal text fields with thick Crimson left-borders.
- **Typography:** Uses monospace and `Rajdhani` fonts to emphasize the data-terminal aesthetic.

## 4. Tactical HUD Command Panel (Bottom Sheet Modal)
- **Concept:** Replaces the standard popup/modal when a building marker is tapped. It functions as a tactical "Target Acquisition" readout.
- **Positioning:** A bottom-anchored sliding panel (Modal/BottomSheet).
- **Visuals:** 
  - Background: Dark Glassmorphism (`rgba(0,0,0,0.85)` with background blur).
  - Accent: A strict, heavy Crimson top border.
- **Data Display:**
  - Target building name (Bold, Uppercase, White).
  - Distance indicator (Grey).
  - Status badge: "LOCKED" (red-tinted) or "UNLOCKED" (grey/white).
- **Action Grid:**
  - Contains two dark, angular action buttons: "DEPLOY AR" and "VIRTUAL TOUR".
- **Locked State Constraints:** 
  - If a building is locked, a monospace warning appears: `⚠ PHYSICAL DEPLOYMENT REQUIRED TO UNLOCK`.
  - The Action buttons are visually dimmed/disabled until the user travels to the location.

## 5. Scope & State 
This redesign is purely frontend styling and structural JSX updates. All existing location tracking (`useLocationTracking`) and unlock logic (`useUnlockedBuildings`) hooks remain unchanged. The updates will happen entirely within `mobile/src/app/(tabs)/explore.js` and its associated components.
