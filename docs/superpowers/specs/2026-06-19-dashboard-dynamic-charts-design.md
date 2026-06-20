# Dashboard Dynamic Charts Design Specification

## Overview
The Admin Dashboard currently relies on manually constructed CSS `div` elements to display data (e.g., the Weekly GPS Unlocks graph). This feature replaces those static representations with interactive, professional, SVG-based charts using the `recharts` library.

## Approach
Implement `recharts` (a React-based charting library) to render dynamic charts with hover states, tooltips, and responsive sizing.

## Components

### 1. Dependency Addition
- Install `recharts` inside the `web` workspace.

### 2. Weekly GPS Unlocks Chart
- **Component:** `<ResponsiveContainer>` wrapped around a `<BarChart>`.
- **Data Source:** Existing `stats.weekly_data` (array of `{ day: 'Mon', value: 12 }`).
- **Features:**
  - `XAxis` displaying the day of the week.
  - `Tooltip` with a custom style matching the WMSU theme (white background, border, shadow).
  - `Bar` component using `theme.colors.primary` (`#8A1538`). We will utilize the `activeBar` prop or CSS transitions for hover effects.

### 3. Building Status Summary Chart
- **Current State:** A text-based list of buildings and their statuses.
- **New Component:** A visual summary using `<PieChart>` (configured as a Donut chart with `innerRadius`).
- **Data Transformation:** Process `stats.building_status` to tally the counts of each status (e.g., `Live`, `Draft`, `Hidden`).
- **Features:**
  - Interactive slices with distinct colors (e.g., Green for Live, Gray for Draft, Red/Orange for Hidden).
  - Hover tooltip showing exact counts.
  - Custom `<Legend>` or adjacent text to display the color mapping clearly.
- Note: The original list view can be preserved below the chart if space permits, or replaced entirely depending on layout constraints.

## Technical Considerations
- **Responsiveness:** All charts must use `<ResponsiveContainer width="100%" height="100%">` so they scale elegantly on smaller laptop screens.
- **Performance:** `recharts` is modular and optimized for React, so it won't impact dashboard load times significantly.

## Testing
- Verify that hovering over bars/pie slices displays the correct tooltips.
- Resize the browser window to ensure charts shrink and expand correctly without breaking the layout grid.
