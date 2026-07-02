# Implementation Plan: Phase 6 Profile Tab Redesign

## Target File
`mobile/src/app/(tabs)/profile.js`

## Task 1: RPG Stats Menu (Top Section)
- **Goal:** Update the `playerCard` and `progressHeader` to the Crimson + White RPG aesthetic.
- **Actions:**
  - Update `playerCard` styling to remove generic backgrounds and apply a crisp white background with Crimson (`theme.colors.primary`) borders.
  - Update Avatar placeholder to use a Crimson border and font.
  - Update `progressHeader` to use `fonts.heading.bold` (Rajdhani) with Crimson color.
  - Add a "Gamified Stats Block" below the EXP bar (showing total quests and total badges) styled like a stat sheet grid.

## Task 2: Horizontal Badge Carousel (Middle Section)
- **Goal:** Refactor the Badge Showcase from a static grid to a horizontal scrolling carousel.
- **Actions:**
  - Change the `ScrollView` or `View` wrapping the badges to a horizontal `ScrollView` (`horizontal={true} showsHorizontalScrollIndicator={false}`).
  - Update the `badgeItem` style:
    - Earned badges: Glowing Crimson icons in circular borders.
    - Locked badges: Grey dashed borders with lock icons.
  - Ensure the carousel items have consistent width and padding.

## Task 3: Cyberpunk Mission Log (Bottom Section)
- **Goal:** Redesign the Quest History section into a monospaced terminal readout.
- **Actions:**
  - Remove the old `questCard` styles (background colors, rounded corners).
  - Apply a terminal log style container (`backgroundColor: '#fafafa'`, `borderLeftWidth: 2`, `borderLeftColor: theme.colors.primary`).
  - Style each `questCard` as a log entry:
    - Replace the standard title with `[COMPLETED] ${quest.target_building}`.
    - Use `fontFamily: 'monospace'` for all text in this section.
    - Show `REWARD: +${quest.reward_exp} EXP` prominently in Crimson.
    - Separate entries with a dashed bottom border.

## Task 4: UI Polish & Token Enforcement
- **Goal:** Ensure all fonts and colors perfectly align with Phase 1-5 updates.
- **Actions:**
  - Verify all headers use `fonts.heading.bold`.
  - Ensure no generic grey/dark mode elements remain.
  - Commit changes to Git.
