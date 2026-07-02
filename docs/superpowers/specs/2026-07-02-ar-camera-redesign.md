# AR Camera Scanner Redesign Spec

## Overview
Phase 5 of the UI/UX Redesign focuses on the AR Camera Tab (`mobile/src/app/(tabs)/ar.js`). The goal is to transform the standard camera view into a Gamified "Minimalist Cyberpunk" HUD, utilizing the Crimson Red and White theme while keeping the camera feed unobstructed.

## Architecture & Components
1. **The HUD Overlays (`ar.js`)**:
   - **Reticle (Targeting Center):** Replaced with a pulsing, animated White/Crimson crosshair.
   - **Target Card (Top HUD):** Upgraded to a translucent, frosted glass panel (`rgba(15, 23, 42, 0.85)`) with glowing Crimson borders. Typography will use `Rajdhani` for a terminal/tech feel.
   - **Action Buttons:** The "Claim Reward" button will match the gamified action grid buttons (white/crimson).
2. **Trivia Modal**:
   - The popup that slides down upon claiming a quest will retain a **Clean White and Crimson** look to match the aesthetic established in the Home Tab cards.
3. **Animations**:
   - The central reticle will pulse continuously to simulate "scanning".
   - Badges and Rank Up toasts will be updated to match the HUD styling.

## Implementation Plan Scope
- Overhaul `StyleSheet` in `ar.js` to implement glassmorphism and glowing borders.
- Add `Animated.Value` loops for the reticle pulsing effect.
- Update fonts to `Rajdhani` / `Exo 2` within the camera HUD.
- No backend or data flow changes are required; this is purely a presentation layer redesign.

## Error Handling & Testing
- Ensure the gamified HUD elements do not interfere with the `pointerEvents` of the camera controls or QR scanner toggle.
- Verify that the Trivia Modal remains highly legible on the dark camera background.
