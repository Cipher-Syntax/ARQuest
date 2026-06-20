# 3D Viewer Trivia Overlay Design Specification

## Overview
The goal is to enrich the standalone `Building3DViewerScreen` (accessible via "Deploy 3D Model") by displaying random trivia facts about the selected building while the user interacts with the 3D model.

## Approach
Implement a "HUD Overlay" over the 3D WebView that fetches and displays a random trivia fact.

## Components

### 1. Data Fetching
- **Endpoint:** `GET /api/buildings/trivias/?building_id={buildingId}`
- **Trigger:** Fetch when the `Building3DViewerScreen` mounts and `buildingId` is present.
- **Logic:** If multiple trivia facts are returned, select one at random. If none are returned, gracefully hide the trivia UI block.

### 2. State Management
- Add `fetchedTrivia` (string or null) to the local state of `Building3DViewerScreen`.

### 3. UI Implementation
- Create a new floating UI container (`hudTriviaContainer`) inside `Building3DViewerScreen`.
- Position it within the `hudBottomContainer`, sitting just above the `descriptionScroll` box.
- **Styling Details:**
  - Background: Semi-transparent to match the WMSU HUD theme (e.g., `theme.colors.surface` with opacity or soft borders).
  - Header: "DID YOU KNOW?" in a small, bold, highlight color (`theme.colors.arHighlight`).
  - Text: Monospace font, readable color (`theme.colors.textSecondary`).
  - Layout: Padding, subtle border-radius matching existing HUD components.

## Error Handling
- If the trivia API call fails or times out, the `fetchedTrivia` state remains null, and the trivia card is simply not rendered. This ensures the primary 3D model viewing experience is never blocked by a failed trivia fetch.

## Testing
- Ensure that the 3D model still loads correctly.
- Verify that a building with trivia properly displays the "DID YOU KNOW?" card.
- Verify that a building without trivia simply hides the card without breaking the layout.
