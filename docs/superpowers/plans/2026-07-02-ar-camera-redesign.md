# AR Camera Scanner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the AR Camera UI into a Gamified HUD utilizing a strict Crimson Red and White theme with a pulsing animated reticle.

**Architecture:** We are updating the stylesheet and component state inside `mobile/src/app/(tabs)/ar.js`. We will add an `Animated.Value` for the reticle's opacity and scale, and update the existing generic styles to match the gamified UI layout of the other tabs.

**Tech Stack:** React Native, Expo, React Native Animated.

---

### Task 1: Add Pulsing Animation to Reticle

**Files:**
- Modify: `mobile/src/app/(tabs)/ar.js`

- [ ] **Step 1: Add pulseAnim Ref to State**

Modify `mobile/src/app/(tabs)/ar.js` around line 45. Add a new `useRef` for the pulse animation:

```javascript
    const slideAnim = useRef(new Animated.Value(400)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    const rankAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0.3)).current; // ADDED
```

- [ ] **Step 2: Create useEffect Loop for Animation**

Modify `mobile/src/app/(tabs)/ar.js` around line 75, below the existing `useEffect` for quests:

```javascript
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, [pulseAnim]);
```

- [ ] **Step 3: Update Reticle Component to use Animated.View**

Modify the JSX in `mobile/src/app/(tabs)/ar.js` around line 391:

Change this:
```javascript
                        <View style={styles.reticleBottomRight} />
                        <View style={styles.reticleCenterPoint} />
                    </View>
```

To this:
```javascript
                        <View style={styles.reticleBottomRight} />
                        <Animated.View style={[styles.reticleCenterPoint, { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]} />
                    </View>
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(tabs\)/ar.js
git commit -m "feat(mobile): add pulsing animation to AR camera reticle"
```

---

### Task 2: Gamify the Target Card and HUD Elements

**Files:**
- Modify: `mobile/src/app/(tabs)/ar.js`

- [ ] **Step 1: Update TargetCard and TargetLabel Styles**

Modify `styles` in `mobile/src/app/(tabs)/ar.js` starting around line 585:

```javascript
    targetCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(178, 24, 48, 0.5)',
        borderRadius: theme.radius.md,
        padding: 16,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5 },
    targetLabel: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 4 },
    buildingLabel: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.textPrimary,
        fontSize: 22,
        letterSpacing: 1.5,
        textTransform: 'uppercase' },
    buildingStatus: {
        fontFamily: fonts.body.bold,
        color: theme.colors.accent,
        fontSize: 12,
        marginTop: 4,
        letterSpacing: 1 },
```

- [ ] **Step 2: Gamify the Claim Quest Button**

Modify `styles` in `mobile/src/app/(tabs)/ar.js` around line 660:

```javascript
    claimQuestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: theme.radius.md,
        marginTop: 16,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5 },
    claimQuestBtnText: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 14,
        letterSpacing: 1 },
    claimPointsText: {
        fontFamily: fonts.body.bold,
        color: theme.colors.success,
        fontSize: 11,
        marginTop: 2,
        letterSpacing: 1 },
```

- [ ] **Step 3: Update Reticle Style Colors to Match Theme**

Modify `styles` in `mobile/src/app/(tabs)/ar.js` around line 695. Ensure the reticle lines use the correct primary color (Crimson).

```javascript
    reticleTopLeft: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#B21830' },
    reticleTopRight: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#B21830' },
    reticleBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#B21830' },
    reticleBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#B21830' },
    reticleCenterPoint: { position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, marginLeft: -3, marginTop: -3, backgroundColor: '#B21830', borderRadius: 3 },
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(tabs\)/ar.js
git commit -m "style(mobile): update AR HUD target card and buttons to crisp white and crimson gamified theme"
```

---

### Task 3: Gamify Trivia Modal and Toasts

**Files:**
- Modify: `mobile/src/app/(tabs)/ar.js`

- [ ] **Step 1: Apply White and Crimson to Trivia Modal**

Modify `styles` in `mobile/src/app/(tabs)/ar.js` starting around line 700:

```javascript
    triviaModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10 },
    triviaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16 },
    triviaTitle: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 18,
        letterSpacing: 2 },
    closeTriviaBtn: {
        backgroundColor: theme.colors.surfaceSoft,
        padding: 6,
        borderRadius: 20 },
    triviaContentBorder: {
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 16,
        marginBottom: 20 },
    triviaBuildingName: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 14,
        marginBottom: 8,
        letterSpacing: 2 },
    triviaText: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 22 },
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app/\(tabs\)/ar.js
git commit -m "style(mobile): update AR camera trivia modal to white and crimson theme"
```
