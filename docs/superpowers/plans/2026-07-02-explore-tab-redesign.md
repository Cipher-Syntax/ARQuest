# Explore Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Explore Map Tab to match the Gamified Crimson + White visual aesthetic using tactical HUD elements.

**Architecture:** We will apply frontend styling updates to `mobile/src/app/(tabs)/explore.js`. We will redesign the search overlay into a Cyberpunk Side Terminal, and the building details modal into a Tactical HUD Command Panel. The underlying React Native Maps and location hooks will remain unchanged.

**Tech Stack:** React Native, Expo Router, React Native Maps, Lucide Icons, Expo Linear Gradient

---

### Task 1: Update Map Polyline & Markers

**Files:**
- Modify: `mobile/src/app/(tabs)/explore.js`

- [ ] **Step 1: Update Map Polyline Styles**
Update the `<Polyline>` inside the `<MapView>` to use the Crimson theme.
```javascript
<Polyline
    coordinates={routeCoordinates}
    strokeColor="#B21830"
    strokeWidth={4}
    lineDashPattern={[8, 4]}
/>
```

- [ ] **Step 2: Update Building Markers**
Update the `<Marker>` rendering loop. Apply a distinct dark-grey/crimson look for unlocked vs locked buildings.
```javascript
{buildingsList.map((building) => {
    const isUnlocked = unlockedBuildings.includes(building.id);
    return (
        <Marker
            key={building.id}
            coordinate={{ latitude: building.latitude, longitude: building.longitude }}
            onPress={() => handleBuildingSelect(building)}
        >
            <View style={{
                backgroundColor: isUnlocked ? '#333333' : 'rgba(0,0,0,0.6)',
                borderWidth: 2,
                borderColor: isUnlocked ? theme.colors.primary : '#555555',
                padding: 4,
                borderRadius: 4
            }}>
                <MapPin size={24} color={isUnlocked ? theme.colors.primary : '#888888'} />
            </View>
        </Marker>
    );
})}
```

- [ ] **Step 3: Run app to verify map styling**
Run: `npm start` inside `mobile` directory. Open the Explore tab and manually verify the map markers and routing line colors are updated.

- [ ] **Step 4: Commit**
```bash
git add mobile/src/app/\(tabs\)/explore.js
git commit -m "feat(mobile): style map routing and markers for explore tab"
```

---

### Task 2: Cyberpunk Side Terminal (Search Overlay)

**Files:**
- Modify: `mobile/src/app/(tabs)/explore.js`

- [ ] **Step 1: Replace Search Overlay JSX**
Replace the existing search bar container with a top-anchored LinearGradient terminal.
```javascript
<LinearGradient
    colors={['rgba(0,0,0,0.9)', 'transparent']}
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
                editable={false}
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
            />
        </View>
    </View>
</LinearGradient>
```

- [ ] **Step 2: Add Terminal Styles**
Add the corresponding styles to the `StyleSheet`.
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
},
terminalInputActive: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
},
```

- [ ] **Step 3: Test Search Overlay UI**
Check the Expo app manually to ensure the side terminal overlay appears correctly over the map.

- [ ] **Step 4: Commit**
```bash
git add mobile/src/app/\(tabs\)/explore.js
git commit -m "feat(mobile): implement cyberpunk side terminal for map search"
```

---

### Task 3: Tactical HUD Command Panel (Bottom Modal)

**Files:**
- Modify: `mobile/src/app/(tabs)/explore.js`

- [ ] **Step 1: Replace Building Modal JSX**
Locate the existing modal/popup for selected buildings and replace it with the Tactical HUD Bottom Sheet.
```javascript
{selectedBuilding && (
    <View style={styles.tacticalModalContainer}>
        <View style={styles.tacticalModalHeader}>
            <View>
                <Text style={styles.tacticalModalSubtitle}>TARGET ACQUIRED</Text>
                <Text style={styles.tacticalModalTitle}>{selectedBuilding.name}</Text>
                <Text style={styles.tacticalModalDistance}>Distance: {selectedBuilding.distance || '?'}m</Text>
            </View>
            <View style={[styles.tacticalModalBadge, !unlockedBuildings.includes(selectedBuilding.id) && styles.tacticalModalBadgeLocked]}>
                <Text style={[styles.tacticalBadgeText, !unlockedBuildings.includes(selectedBuilding.id) && styles.tacticalBadgeTextLocked]}>
                    {unlockedBuildings.includes(selectedBuilding.id) ? 'UNLOCKED' : 'LOCKED'}
                </Text>
            </View>
        </View>

        <View style={styles.tacticalActionGrid}>
            <TouchableOpacity 
                style={[styles.tacticalActionBtn, !unlockedBuildings.includes(selectedBuilding.id) && styles.tacticalActionBtnDisabled]}
                disabled={!unlockedBuildings.includes(selectedBuilding.id)}
                onPress={() => handleDeployAR(selectedBuilding)}
            >
                <Text style={styles.tacticalActionText}>DEPLOY AR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.tacticalActionBtn, !unlockedBuildings.includes(selectedBuilding.id) && styles.tacticalActionBtnDisabled]}
                disabled={!unlockedBuildings.includes(selectedBuilding.id)}
                onPress={() => handleVirtualTour(selectedBuilding)}
            >
                <Text style={styles.tacticalActionText}>3D SCAN</Text>
            </TouchableOpacity>
        </View>

        {!unlockedBuildings.includes(selectedBuilding.id) && (
            <Text style={styles.tacticalWarningText}>
                ⚠ PHYSICAL DEPLOYMENT REQUIRED TO UNLOCK
            </Text>
        )}
    </View>
)}
```

- [ ] **Step 2: Add Tactical Modal Styles**
Add the styles to `explore.js`.
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

- [ ] **Step 3: Test Modal Functionality**
Select a locked and an unlocked building on the map and verify the popup renders the Tactical HUD accurately.

- [ ] **Step 4: Commit**
```bash
git add mobile/src/app/\(tabs\)/explore.js
git commit -m "feat(mobile): implement tactical hud command panel for building selection"
```
