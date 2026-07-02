# Phase 6: Profile Tab Redesign Spec

## Overview
The Profile Tab (`mobile/src/app/(tabs)/profile.js`) will be redesigned to align with the overarching "Minimalist Cyberpunk / Gamified" aesthetic (Crimson + White). The layout will transition from a basic list-view profile into a "Player Stats Menu" resembling an RPG character sheet or an Agent ID interface.

## 1. RPG Stats Menu (Top Section)
The current generic player card will be overhauled into an RPG-style layout.

- **Avatar & Rank:** 
  - Avatar or placeholder will have a stark Crimson border.
  - Username and Rank Title will use the `Rajdhani` (heading) font.
- **Level & EXP Bar:**
  - A prominent, continuous progress bar (Crimson fill on a light grey/white track).
  - Explicit text for `Current EXP / Next Rank EXP`.
- **Gamified Stats Block:**
  - Below the EXP bar, a structured stats grid (e.g., Quests Done, Total Points, Current Streak).
  - Styled with sharp corners, Crimson left-borders, and light grey (`#fafafa`) backgrounds to emulate an RPG stat sheet.

## 2. Horizontal Badge Carousel (Middle Section)
The Badge Showcase will be transformed from a static grid into a modern, scrollable row.

- **Layout:** Horizontal `ScrollView` (Carousel) replacing the standard grid.
- **Earned Badges:** 
  - Displayed as prominent, glowing Crimson icons within circular white borders, featuring subtle drop shadows.
  - Accompanied by the badge name in small, bold Crimson text.
- **Locked Badges:** 
  - Greyed out/muted opacity.
  - Replaced by a padlock icon to encourage progression while maintaining a clean aesthetic.
  - Takes up less vertical space than the previous grid.

## 3. Cyberpunk Mission Log (Bottom Section)
The "Recent Activity" or Quest History section will be redesigned into a dense, monospaced terminal readout.

- **Layout:** A continuous vertical list with no bulky cards.
- **Styling:**
  - Background: Off-white (`#fafafa` or similar surface soft).
  - Border: A single thick Crimson left-border to anchor the list.
  - Font: Monospaced font (`monospace` or `fonts.body` if configured as monospace) for a hacker/agent terminal vibe.
- **Entry Structure:**
  - `[COMPLETED]` prefix in bold Crimson.
  - Date and Target name on subsequent lines.
  - `REWARD: +[X] EXP` clearly visible at the bottom of each entry.
  - Entries separated by dashed grey lines.

## Technical Implementation Details
- **File:** `mobile/src/app/(tabs)/profile.js`
- **Dependencies:** React Native `ScrollView`, `View`, `Text`.
- **Theme Usage:** Strict adherence to `theme.colors.primary` (Crimson) and `theme.colors.surface` (White/Off-white).
- **Fonts:** `fonts.heading.bold` (Rajdhani) for headers, `monospace` for the Mission Log.
