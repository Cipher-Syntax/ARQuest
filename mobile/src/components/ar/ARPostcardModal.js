import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    ActivityIndicator,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library/legacy";
import { captureRef } from "react-native-view-shot";
import {
    Download,
    X,
    MapPin,
    Calendar,
    Award,
    Check,
} from "lucide-react-native";
import { colors, radius } from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import SoundManager from "../../utils/SoundManager";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);

export default function ARPostcardModal({
    visible,
    photoUri,
    building,
    location,
    user,
    onClose,
}) {
    const [scaleAnim] = useState(() => new Animated.Value(0.85));
    const [opacityAnim] = useState(() => new Animated.Value(0));
    const postcardCardRef = useRef(null);

    const [isSaving, setIsSaving] = useState(false);
    const [savedToGallery, setSavedToGallery] = useState(false);

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, scaleAnim, opacityAnim]);

    const handleCloseModal = () => {
        setSavedToGallery(false);
        onClose?.();
    };

    if (!visible || !photoUri) return null;

    // Formatting date & coordinates
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const lat = location?.latitude ?? location?.coords?.latitude ?? building?.latitude;
    const lng = location?.longitude ?? location?.coords?.longitude ?? building?.longitude;
    const coordString = lat && lng
        ? `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`
        : "6.9124° N, 122.0635° E";

    const buildingName = building?.name || "WMSU Campus Landmark";
    const buildingCode = building?.code || "CAMPUS";
    const explorerName = user?.first_name
        ? `${user.first_name} ${user.last_name || ""}`.trim()
        : user?.username || "Campus Explorer";
    const userRole = (user?.role || "Student").toUpperCase();

    const handleSaveToGallery = async () => {
        if (isSaving || savedToGallery) return;
        setIsSaving(true);

        try {
            let permission = await MediaLibrary.getPermissionsAsync();
            if (!permission.granted) {
                permission = await MediaLibrary.requestPermissionsAsync();
            }

            if (!permission.granted) {
                Alert.alert(
                    "Permission Required",
                    "Media Library access is needed to save your postcard to your device gallery."
                );
                setIsSaving(false);
                return;
            }

            // Attempt to capture the styled digital postcard composite
            let targetUri = photoUri;
            if (postcardCardRef.current) {
                try {
                    const postcardUri = await captureRef(postcardCardRef, {
                        format: "jpg",
                        quality: 0.95,
                    });
                    if (postcardUri) {
                        targetUri = postcardUri;
                    }
                } catch (snapErr) {
                    console.warn("Postcard composite capture failed, using raw AR photo:", snapErr);
                }
            }

            await MediaLibrary.saveToLibraryAsync(targetUri);
            setSavedToGallery(true);
            try {
                SoundManager.play("quest_complete");
            } catch {
                // Non-fatal
            }
        } catch (error) {
            console.error("Save to gallery error:", error);
            Alert.alert("Save Failed", "Could not save the postcard. Please check app permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            transparent
            animationType="none"
            visible={visible}
            onRequestClose={handleCloseModal}
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Close Icon (Top Right) */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleCloseModal}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <X size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* --- THE PHYSICAL POSTCARD (Captured by view-shot on save) --- */}
                    <View
                        ref={postcardCardRef}
                        collapsable={false}
                        style={styles.postcardFrame}
                    >
                        {/* 1. Header Ribbon */}
                        <View style={styles.postcardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.postcardInstitution}>
                                    WESTERN MINDANAO STATE UNIVERSITY
                                </Text>
                                <Text style={styles.postcardSubHeader}>
                                    ARQUEST • OFFICIAL SPATIAL DISCOVERY
                                </Text>
                            </View>
                            <View style={styles.insigniaPill}>
                                <Award size={14} color="#F1C40F" style={{ marginRight: 4 }} />
                                <Text style={styles.insigniaText}>VERIFIED</Text>
                            </View>
                        </View>

                        {/* 2. Photo Area */}
                        <View style={styles.photoContainer}>
                            <Image
                                source={{ uri: photoUri }}
                                style={styles.photo}
                                resizeMode="cover"
                            />
                            {/* In-photo landmark tag */}
                            <LinearGradient
                                colors={["transparent", "rgba(0, 0, 0, 0.75)"]}
                                style={styles.photoGradient}
                            >
                                <View style={styles.photoTagRow}>
                                    <MapPin size={14} color="#00E5FF" style={{ marginRight: 4 }} />
                                    <Text style={styles.photoTagTitle} numberOfLines={1}>
                                        {buildingName}
                                    </Text>
                                </View>
                                <Text style={styles.photoTagSubtitle}>
                                    {buildingCode} • WMSU MAIN CAMPUS
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* 3. Postcard Metadata & Postmark */}
                        <View style={styles.postcardDetails}>
                            {/* Left Column: Explorer info and GPS */}
                            <View style={styles.detailsLeft}>
                                <View style={styles.metaRow}>
                                    <MapPin size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                                    <Text style={styles.metaText} numberOfLines={1}>
                                        {coordString}
                                    </Text>
                                </View>

                                <View style={styles.metaRow}>
                                    <Calendar size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                                    <Text style={styles.metaText}>
                                        {formattedDate} • {formattedTime}
                                    </Text>
                                </View>

                                <View style={styles.explorerRow}>
                                    <View style={styles.explorerAvatar}>
                                        <Text style={styles.explorerAvatarText}>
                                            {(explorerName[0] || "U").toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.explorerName} numberOfLines={1}>
                                            {explorerName}
                                        </Text>
                                        <Text style={styles.explorerRole}>
                                            {userRole}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Right Column: Circular Postmark Stamp */}
                            <View style={styles.detailsRight}>
                                <View style={styles.stampCircle}>
                                    <Text style={styles.stampTextTop}>WMSU • AR</Text>
                                    <View style={styles.stampDivider} />
                                    <Text style={styles.stampTextMiddle}>DISCOVERED</Text>
                                    <View style={styles.stampDivider} />
                                    <Text style={styles.stampTextBottom}>
                                        {now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {/* --- END POSTCARD --- */}

                    {/* Actions Area */}
                    <View style={styles.actionsArea}>
                        {/* Save to Gallery Button */}
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                savedToGallery
                                    ? styles.saveButtonSuccess
                                    : styles.saveButtonPrimary,
                            ]}
                            onPress={handleSaveToGallery}
                            disabled={isSaving}
                            activeOpacity={0.8}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : savedToGallery ? (
                                <>
                                    <Check size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.saveButtonText}>SAVED TO GALLERY ✓</Text>
                                </>
                            ) : (
                                <>
                                    <Download size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.saveButtonText}>SAVE POSTCARD TO GALLERY</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Dismiss Button */}
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={handleCloseModal}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.doneButtonText}>DONE & RETURN TO AR</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(7, 42, 48, 0.88)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContainer: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    closeButton: {
        position: "absolute",
        top: -42,
        right: 4,
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
    },
    postcardFrame: {
        width: CARD_WIDTH,
        backgroundColor: "#FFFFFF",
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: "#7F0303",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 10,
    },
    postcardHeader: {
        backgroundColor: "#7F0303",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#5E0202",
    },
    postcardInstitution: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    postcardSubHeader: {
        fontFamily: fonts.body.regular,
        fontSize: 8,
        color: "#F3F4F6",
        letterSpacing: 0.5,
        marginTop: 1,
    },
    insigniaPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderColor: "#F1C40F",
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    insigniaText: {
        fontFamily: fonts.heading.bold,
        fontSize: 8,
        color: "#F1C40F",
        letterSpacing: 0.5,
    },
    photoContainer: {
        width: "100%",
        height: 220,
        backgroundColor: "#1A1A1A",
        position: "relative",
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    photoGradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 70,
        justifyContent: "flex-end",
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    photoTagRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    photoTagTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: "#FFFFFF",
        letterSpacing: 0.5,
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    photoTagSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: "#C9D6DA",
        letterSpacing: 0.5,
        marginTop: 1,
    },
    postcardDetails: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    detailsLeft: {
        flex: 1,
        justifyContent: "center",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    metaText: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: colors.textSecondary,
    },
    explorerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    explorerAvatar: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#7F0303",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    explorerAvatarText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#FFFFFF",
    },
    explorerName: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: colors.textPrimary,
    },
    explorerRole: {
        fontFamily: fonts.body.regular,
        fontSize: 9,
        color: colors.textMuted,
        letterSpacing: 0.5,
    },
    detailsRight: {
        width: 80,
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 8,
    },
    stampCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: "#7F0303",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        transform: [{ rotate: "-8deg" }],
        backgroundColor: "rgba(127, 3, 3, 0.04)",
    },
    stampTextTop: {
        fontFamily: fonts.heading.bold,
        fontSize: 8,
        color: "#7F0303",
        letterSpacing: 0.5,
    },
    stampDivider: {
        width: 36,
        height: 1,
        backgroundColor: "#7F0303",
        marginVertical: 2,
        opacity: 0.6,
    },
    stampTextMiddle: {
        fontFamily: fonts.heading.bold,
        fontSize: 7,
        color: "#7F0303",
        letterSpacing: 0.8,
    },
    stampTextBottom: {
        fontFamily: fonts.body.regular,
        fontSize: 8,
        color: "#7F0303",
        marginTop: 1,
    },
    actionsArea: {
        width: CARD_WIDTH,
        marginTop: 14,
        alignItems: "center",
    },
    saveButton: {
        width: "100%",
        flexDirection: "row",
        height: 48,
        borderRadius: radius.md,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    saveButtonPrimary: {
        backgroundColor: "#7F0303",
    },
    saveButtonSuccess: {
        backgroundColor: "#059669",
    },
    saveButtonText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    doneButton: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    doneButtonText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#C9D6DA",
        letterSpacing: 1,
    },
});
