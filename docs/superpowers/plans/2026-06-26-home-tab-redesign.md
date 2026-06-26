# Home Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Home tab to feature a split dashboard balancing Gamification (EXP/Rank) and Utility (Nearest Target/Distance), alongside a quick action grid.

**Architecture:** We will modify the existing `index.js` screen. We will introduce `useLocationTracking` and `geofencingService` to fetch live distance data. We will restyle the layout to feature side-by-side cards for the middle split and a grid of touchables for quick actions.

**Tech Stack:** React Native, Expo, Lucide Icons, Expo Router.

---

### Task 1: Integrate Location Tracking and Environment State

**Files:**
- Modify: `mobile/src/app/(tabs)/index.js`

- [ ] **Step 1: Add imports for location and buildings**

Add imports for `useLocationTracking`, `geofencingService`, and `MapPin` icon. We also need `useEffect` and `useState` (which are already imported).

```javascript
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import ARGlassCard from "../../components/ARGlassCard";
import { Trophy, Compass, Crosshair, MapPin, Map as MapIcon, ScanLine, BarChart2 } from "lucide-react-native";
import { router } from "expo-router";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { geofencingService } from "../../services/geofencingService";
```

- [ ] **Step 2: Add hooks and state for distance and buildings**

Inside `HomeScreen()`, fetch buildings and calculate distance.

```javascript
export default function HomeScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // New state & hooks
    const { location } = useLocationTracking();
    const [buildings, setBuildings] = useState([]);
    const [nearestBuilding, setNearestBuilding] = useState(null);
    const [distanceToNearest, setDistanceToNearest] = useState(null);

    // Existing stats fetch
    useEffect(() => {
        const fetchStats = async () => {
            if (user?.role !== 'student') {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/api/gamification/leaderboard/');
                if (res.data.success) {
                    const myStats = res.data.data.find(r => r.username === user.username);
                    setStats(myStats);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user]);

    // New buildings fetch
    useEffect(() => {
        const fetchBuildings = async () => {
            try {
                const res = await api.get('/api/buildings/');
                if (res.data.success) {
                    setBuildings(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch buildings", error);
            }
        };
        fetchBuildings();
    }, []);

    // Calculate nearest
    useEffect(() => {
        if (location && buildings.length > 0) {
            let minDistance = Infinity;
            let nearest = null;
            
            buildings.forEach(b => {
                if (b.latitude && b.longitude) {
                    const dist = geofencingService.calculateDistance(
                        location.latitude, location.longitude, 
                        parseFloat(b.latitude), parseFloat(b.longitude)
                    );
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = b;
                    }
                }
            });
            
            if (nearest) {
                setNearestBuilding(nearest);
                setDistanceToNearest(Math.round(minDistance));
            }
        }
    }, [location, buildings]);
```

### Task 2: Implement the Status Header and Pulsating Indicator

**Files:**
- Modify: `mobile/src/app/(tabs)/index.js`

- [ ] **Step 1: Update the header UI**

Replace the existing `header` block in the JSX with the Status Card containing the GPS indicator.

```javascript
                <View style={styles.headerCard}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>SYSTEM ONLINE</Text>
                        <Text style={styles.title}>Welcome, {user?.username || "Guest"}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role?.toUpperCase() || "UNKNOWN"}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.gpsIndicator, location ? styles.gpsActive : styles.gpsSearching]} />
                        <Text style={styles.gpsText}>{location ? "GPS LOCKED" : "SEARCHING..."}</Text>
                    </View>
                </View>
```

### Task 3: Implement the Split Dashboard (Middle)

**Files:**
- Modify: `mobile/src/app/(tabs)/index.js`

- [ ] **Step 1: Replace the old HUD card with the Split Cards**

Remove the existing `hudCard` and `missionCard` JSX blocks and insert the Split Row.

```javascript
                {user?.role === 'student' && (
                    <View style={styles.splitRow}>
                        {/* Gamification Left Card */}
                        <ARGlassCard style={styles.splitCard}>
                            {loading ? (
                                <ActivityIndicator color={theme.colors.arHighlight} />
                            ) : (
                                <View style={styles.splitCardInner}>
                                    <Trophy color={theme.colors.accent} size={24} />
                                    <Text style={styles.splitValue}>{stats?.points || 0}</Text>
                                    <Text style={styles.splitLabel}>EXP POINTS</Text>
                                    
                                    <View style={styles.miniDivider} />
                                    
                                    <Text style={styles.splitSubValue}>#{stats?.rank || "--"}</Text>
                                    <Text style={styles.splitSubLabel}>GLOBAL RANK</Text>
                                </View>
                            )}
                        </ARGlassCard>

                        {/* Utility Right Card */}
                        <ARGlassCard style={styles.splitCard}>
                            <View style={styles.splitCardInner}>
                                <MapPin color={theme.colors.arHighlight} size={24} />
                                <Text style={styles.splitValue}>{distanceToNearest !== null ? `${distanceToNearest}m` : "--"}</Text>
                                <Text style={styles.splitLabel}>DISTANCE</Text>
                                
                                <View style={styles.miniDivider} />
                                
                                <Text style={styles.targetName} numberOfLines={2}>
                                    {nearestBuilding ? nearestBuilding.name : "ACQUIRING TARGET"}
                                </Text>
                                <Text style={styles.splitSubLabel}>NEAREST NODE</Text>
                            </View>
                        </ARGlassCard>
                    </View>
                )}
```

### Task 4: Implement Quick Action Grid (Bottom)

**Files:**
- Modify: `mobile/src/app/(tabs)/index.js`

- [ ] **Step 1: Add Quick Actions Grid**

Remove the lone `ARButton` and replace it with a grid of action buttons.

```javascript
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/ar')}>
                            <View style={styles.actionIconWrap}>
                                <ScanLine color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Deploy AR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/buildings')}>
                            <View style={styles.actionIconWrap}>
                                <MapIcon color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Radar Map</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/leaderboard')}>
                            <View style={styles.actionIconWrap}>
                                <BarChart2 color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={styles.actionText}>Rankings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
```

### Task 5: Add the Styles

**Files:**
- Modify: `mobile/src/app/(tabs)/index.js`

- [ ] **Step 1: Add the new styles to `StyleSheet.create`**

Append or replace the necessary styles at the bottom of the file to support the new layout.

```javascript
    headerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        marginTop: theme.spacing.md,
        backgroundColor: theme.colors.surfaceSoft,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 10,
    },
    gpsIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 4,
    },
    gpsActive: {
        backgroundColor: theme.colors.success,
        shadowColor: theme.colors.success,
        shadowOpacity: 0.8,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 0 },
    },
    gpsSearching: {
        backgroundColor: theme.colors.accent,
    },
    gpsText: {
        fontFamily: fonts.body.bold,
        fontSize: 8,
        color: theme.colors.textMuted,
        letterSpacing: 1,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
        gap: 12,
    },
    splitCard: {
        flex: 1,
        padding: theme.spacing.md,
    },
    splitCardInner: {
        alignItems: 'center',
    },
    splitValue: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.textPrimary,
        fontSize: 32,
        fontWeight: "900",
        marginTop: 8,
    },
    splitLabel: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.textMuted,
        fontSize: 10,
        fontWeight: "bold",
        letterSpacing: 1,
        marginTop: 4,
    },
    miniDivider: {
        width: '50%',
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    splitSubValue: {
        fontFamily: fonts.hud.bold,
        color: theme.colors.arHighlight,
        fontSize: 18,
        fontWeight: "900",
    },
    targetName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.arHighlight,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: 'center',
    },
    splitSubLabel: {
        fontFamily: fonts.hud.medium,
        color: theme.colors.textSecondary,
        fontSize: 8,
        fontWeight: "bold",
        letterSpacing: 1,
        marginTop: 2,
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionIconWrap: {
        backgroundColor: 'rgba(178, 24, 48, 0.1)',
        padding: 12,
        borderRadius: 24,
        marginBottom: 8,
    },
    actionText: {
        fontFamily: fonts.heading.medium,
        color: theme.colors.textPrimary,
        fontSize: 11,
        fontWeight: 'bold',
    },
```
