# Explore Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Map Tab (buildings.js) to match the Gamified Crimson + White visual aesthetic using tactical HUD elements.

**Architecture:** We will apply frontend styling updates to `mobile/src/app/(tabs)/buildings.js` and `mobile/assets/buildings-map.html`. We will redesign the search overlay into a Cyberpunk Side Terminal, the building details modal into a Tactical HUD Command Panel, and update the Leaflet map styles for route lines and markers.

**Tech Stack:** React Native, Expo Router, Leaflet (via WebView), Lucide Icons, Expo Linear Gradient

---

### Task 1: Update Leaflet Map Polyline & Markers

**Files:**
- Modify: `mobile/assets/buildings-map.html`

- [ ] **Step 1: Update Routing Polyline Styles**
Locate the `L.polyline` creation (in `updateRoute` or similar) in `buildings-map.html` and update its visual style to match the glowing Crimson theme.
```javascript
// Existing: L.polyline(routeCoords, { color: 'blue', weight: 4 }).addTo(routeLayer);
// New:
L.polyline(routeCoords, { 
    color: '#B21830', 
    weight: 5,
    dashArray: '10, 5'
}).addTo(routeLayer);
```

- [ ] **Step 2: Update Building Markers HTML/CSS**
Locate the marker creation logic (usually `L.divIcon` inside `renderMarkers` or similar). Update the HTML and CSS of the marker to reflect the dark-grey/crimson look for unlocked vs locked buildings.
```javascript
// Find the logic where marker HTML is constructed based on 'isUnlocked'
// Update the HTML string to use the new tactical aesthetic:
const bgColor = isUnlocked ? '#333333' : 'rgba(0,0,0,0.6)';
const borderColor = isUnlocked ? '#B21830' : '#555555';
const iconColor = isUnlocked ? '#B21830' : '#888888';

const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${bgColor}; border: 2px solid ${borderColor}; padding: 4px; border-radius: 4px; display: flex; justify-content: center; align-items: center; width: 24px; height: 24px;">
               <div style="width: 12px; height: 12px; background-color: ${iconColor}; border-radius: 50%;"></div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});
```
*(Adjust the exact HTML string as needed to fit into the existing Leaflet marker setup, but ensure the colors `#B21830`, `#333333` and `#555555` are used).*

- [ ] **Step 3: Commit**
```bash
git add mobile/assets/buildings-map.html
git commit -m "feat(mobile): style leaflet map routing and markers"
```

---

### Task 2: Cyberpunk Side Terminal (Search Overlay)

**Files:**
- Modify: `mobile/src/app/(tabs)/buildings.js`

- [ ] **Step 1: Replace Search Overlay JSX**
Locate the `<View style={styles.searchOverlay}>` (around lines 230-290) in `buildings.js` containing the origin and destination `<TextInput>`s. Replace it with a `<LinearGradient>` top-anchored terminal. Note: you will need to import `LinearGradient` from `'expo-linear-gradient'`.
```javascript
<LinearGradient
    colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)', 'transparent']}
    style={styles.searchTerminal}
    pointerEvents="box-none"
>
    <Text style={styles.terminalHeader}>[ NAV_SYS // ONLINE ]</Text>
    
    <View style={styles.terminalInputContainer}>
        <View style={styles.terminalInputRow}>
            <Text style={styles.terminalInputLabel}>ORG:</Text>
            <TextInput
                style={styles.terminalInput}
                placeholder="LOCALIZATION ACTIVE"
                placeholderTextColor="#666666"
                value={originQuery}
                onChangeText={setOriginQuery}
                onFocus={() => { setIsOriginFocused(true); setIsSearchFocused(false); }}
                onBlur={() => setTimeout(() => setIsOriginFocused(false), 200)}
            />
        </View>
        
        <View style={styles.terminalInputRowActive}>
            <Text style={styles.terminalInputLabel}>DST:</Text>
            <TextInput
                style={styles.terminalInputActive}
                placeholder="INPUT COORDINATES"
                placeholderTextColor="#888888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => { setIsSearchFocused(true); setIsOriginFocused(false); }}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
        </View>
    </View>
</LinearGradient>
```

- [ ] **Step 2: Add Terminal Styles**
Remove the old `searchOverlay`, `searchInputWrapper`, `searchInput` styles and add the new terminal styles.
```javascript
searchTerminal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderTopWidth: 4,
    borderTopColor: theme.colors.primary,
    zIndex: 10,
},
terminalHeader: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 16,
},
terminalInputContainer: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.primary,
    paddingLeft: 12,
    gap: 12,
},
terminalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
},
terminalInputRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
},
terminalInputLabel: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666666',
    width: 35,
},
terminalInput: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
},
terminalInputActive: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    backgroundColor: 'rgba(178,24,48,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
},
```

- [ ] **Step 3: Commit**
```bash
git add mobile/src/app/\(tabs\)/buildings.js
git commit -m "feat(mobile): implement cyberpunk side terminal for map search"
```

---

### Task 3: Tactical HUD Command Panel (Bottom Modal)

**Files:**
- Modify: `mobile/src/app/(tabs)/buildings.js`

- [ ] **Step 1: Replace Building Modal JSX**
Locate the existing Modal for `selectedBuilding` (around line 354, containing `bottomSheet`, `sheetHeader`, etc.). Replace the `TouchableOpacity` active area inside the modal with the Tactical HUD structure.
```javascript
{/* AR Gamified Bottom Sheet Modal */}
<Modal
    animationType="slide"
    transparent={true}
    visible={modalVisible}
    onRequestClose={() => setModalVisible(false)}
>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.tacticalModalContainer}>
            
            {selectedBuilding && (
                <>
                    <View style={styles.tacticalModalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tacticalModalSubtitle}>TARGET ACQUIRED</Text>
                            <Text style={styles.tacticalModalTitle} numberOfLines={2}>{selectedBuilding.name}</Text>
                            {routeDistance && (
                                <Text style={styles.tacticalModalDistance}>Distance: {routeDistance}</Text>
                            )}
                        </View>
                        
                        <View style={[
                            styles.tacticalModalBadge, 
                            !unlockedBuildings.some(b => b.id === selectedBuilding.id) && styles.tacticalModalBadgeLocked
                        ]}>
                            <Text style={[
                                styles.tacticalBadgeText,
                                !unlockedBuildings.some(b => b.id === selectedBuilding.id) && styles.tacticalBadgeTextLocked
                            ]}>
                                {unlockedBuildings.some(b => b.id === selectedBuilding.id) ? 'UNLOCKED' : 'LOCKED'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.tacticalActionGrid}>
                        <TouchableOpacity 
                            style={[
                                styles.tacticalActionBtn, 
                                (!unlockedBuildings.some(b => b.id === selectedBuilding.id) && role !== 'visitor') && styles.tacticalActionBtnDisabled
                            ]}
                            disabled={!unlockedBuildings.some(b => b.id === selectedBuilding.id) && role !== 'visitor'}
                            onPress={handleDeployAR}
                        >
                            <Text style={styles.tacticalActionText}>DEPLOY AR</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.tacticalActionBtn, 
                                (!canView3D) && styles.tacticalActionBtnDisabled
                            ]}
                            disabled={!canView3D}
                            onPress={handleView3D}
                        >
                            <Text style={styles.tacticalActionText}>3D SCAN</Text>
                        </TouchableOpacity>
                    </View>

                    {(!unlockedBuildings.some(b => b.id === selectedBuilding.id) && role !== 'visitor') && (
                        <Text style={styles.tacticalWarningText}>
                            ⚠ PHYSICAL DEPLOYMENT REQUIRED TO UNLOCK
                        </Text>
                    )}
                </>
            )}
        </TouchableOpacity>
    </TouchableOpacity>
</Modal>
```

- [ ] **Step 2: Add Tactical Modal Styles**
Remove the old `bottomSheet`, `sheetHeader`, `buildingName`, `badge`, `actionButtons`, `view3dButton`, etc., and replace them with the Tactical HUD styles. Ensure you keep unrelated modal styles (like `modalOverlay`).
```javascript
tacticalModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 3,
    borderTopColor: theme.colors.primary,
    padding: 20,
    paddingBottom: 40,
},
tacticalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
},
tacticalModalSubtitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
},
tacticalModalTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 22,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 4,
},
tacticalModalDistance: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#999999',
},
tacticalModalBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#999999',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
},
tacticalModalBadgeLocked: {
    backgroundColor: 'rgba(178,24,48,0.2)',
    borderColor: theme.colors.primary,
},
tacticalBadgeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
},
tacticalBadgeTextLocked: {
    color: theme.colors.primary,
},
tacticalActionGrid: {
    flexDirection: 'row',
    gap: 12,
},
tacticalActionBtn: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#555555',
    alignItems: 'center',
},
tacticalActionBtnDisabled: {
    opacity: 0.5,
},
tacticalActionText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
},
tacticalWarningText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.primary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 16,
},
```

- [ ] **Step 3: Commit**
```bash
git add mobile/src/app/\(tabs\)/buildings.js
git commit -m "feat(mobile): implement tactical hud command panel for building selection"
```
