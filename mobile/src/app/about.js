import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Compass,
    Target,
    Layers,
    Sparkles,
    ShieldCheck,
    Users,
    Mail,
    MapPin,
    ScanLine,
    Eye,
    CheckCircle2,
    BookOpen,
} from "lucide-react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";

export default function AboutScreen() {
    const handleEmail = () => {
        Linking.openURL("mailto:support@arquest.com?subject=ARQuest Support Inquiry");
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About ARQuest</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Brand Hero Card */}
                <LinearGradient
                    colors={["#9b1b30", "#6b101f"]}
                    style={styles.heroCard}
                >
                    <View style={styles.logoBadge}>
                        <Compass size={40} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroTitle}>ARQuest</Text>
                    <Text style={styles.heroTagline}>
                        Campus Navigation & Accreditation System
                    </Text>
                </LinearGradient>

                {/* 1. What is ARQuest? */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Compass size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>What is ARQuest?</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        ARQuest is an interactive campus navigation and evaluation application. It uses GPS geofencing, Augmented Reality (AR), 3D building models, and 360° virtual tours to help students, accreditors, and visitors explore and understand the university campus.
                    </Text>
                </View>

                {/* 2. Our Purpose */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Target size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Our Purpose</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        Traditional printed campus maps can be confusing and static. ARQuest was created to solve everyday navigation friction, provide interactive location-based learning, and give accreditors a seamless way to inspect university facilities remotely or on-site.
                    </Text>
                </View>

                {/* 3. What You Can Do */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Layers size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>What You Can Do</Text>
                    </View>
                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <MapPin size={18} color={theme.colors.primary} style={styles.featureIcon} />
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Explore the Campus</Text>
                                <Text style={styles.featureItemDesc}>
                                    Navigate with a live 2D GPS map, find department offices, and check walking distances.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <ScanLine size={18} color={theme.colors.primary} style={styles.featureIcon} />
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Use the AR Camera</Text>
                                <Text style={styles.featureItemDesc}>
                                    Look through your camera to see floating building labels, waypoints, and scan entrance QR codes.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <Eye size={18} color={theme.colors.primary} style={styles.featureIcon} />
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Inspect 3D & 360° Tours</Text>
                                <Text style={styles.featureItemDesc}>
                                    Examine interactive 3D building architecture models and navigate high-resolution 360° virtual rooms.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <Sparkles size={18} color={theme.colors.primary} style={styles.featureIcon} />
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Complete Missions & Quizzes</Text>
                                <Text style={styles.featureItemDesc}>
                                    Solve daily objectives, take campus trivia quizzes, maintain streaks, and earn player badges.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <CheckCircle2 size={18} color={theme.colors.primary} style={styles.featureIcon} />
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Track Visited Buildings</Text>
                                <Text style={styles.featureItemDesc}>
                                    Keep an organized checklist of all campus facilities you have discovered or evaluated.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Key Features */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <ShieldCheck size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Key Features</Text>
                    </View>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>GPS Geofencing:</Text> Automatically unlocks nearby building content as you walk into facility zones.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>3D Model Viewer:</Text> Interactive 3D structural models with smooth rotation and zoom inspection.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>360° Virtual Walkthroughs:</Text> Panorama navigation between rooms for remote facility evaluation.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>Role-Based Access Control (RBAC):</Text> Tailored experiences for Students, Accreditors, Visitors, and Admins.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>QR Code Verification:</Text> Physical entrance marker scanning for instant checkpoint validation.
                        </Text>
                    </View>
                </View>

                {/* 5. How It Works */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <BookOpen size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>How It Works</Text>
                    </View>
                    <View style={styles.stepList}>
                        <View style={styles.stepItem}>
                            <View style={styles.stepNumberBadge}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                                <Text style={styles.stepTitle}>Sign In or Enter as Guest</Text>
                                <Text style={styles.stepDesc}>
                                    Log in to your account or explore as a Visitor. The app sets up features matching your role.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.stepItem}>
                            <View style={styles.stepNumberBadge}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                                <Text style={styles.stepTitle}>Walk Around Campus</Text>
                                <Text style={styles.stepDesc}>
                                    Your phone GPS tracks your location on the map and calculates distances to all campus buildings.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.stepItem}>
                            <View style={styles.stepNumberBadge}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                                <Text style={styles.stepTitle}>Discover & Unlock</Text>
                                <Text style={styles.stepDesc}>
                                    Walking near a building triggers automatic unlocking, giving you access to 3D models and trivia.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.stepItem}>
                            <View style={styles.stepNumberBadge}>
                                <Text style={styles.stepNumberText}>4</Text>
                            </View>
                            <View style={styles.stepTextWrap}>
                                <Text style={styles.stepTitle}>Interact & Complete</Text>
                                <Text style={styles.stepDesc}>
                                    Point your AR camera, answer quizzes for EXP, or conduct structured accreditation reviews.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 6. Meet the Team */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Users size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Meet the Team</Text>
                    </View>
                    <View style={styles.teamBox}>
                        <Text style={styles.teamGroup}>Team Spiral</Text>
                        <Text style={styles.teamRole}>
                            BSIT Capstone Development & Research Group
                        </Text>
                        <Text style={styles.teamDesc}>
                            Dedicated to designing modern mobile experiences that merge geospatial intelligence, Augmented Reality, and educational technology.
                        </Text>
                    </View>
                </View>

                {/* 7. Contact & Support */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Mail size={20} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Contact & Support</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        Have questions, suggestions, or encountered an issue? Feel free to reach out to our team:
                    </Text>
                    <TouchableOpacity
                        style={styles.emailButton}
                        onPress={handleEmail}
                        activeOpacity={0.8}
                    >
                        <Mail size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.emailButtonText}>support@arquest.com</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
        letterSpacing: 0.5,
    },
    scrollContent: {
        padding: 20,
    },
    heroCard: {
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#9b1b30",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    logoBadge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    heroTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 26,
        color: "#FFFFFF",
        letterSpacing: 1,
        marginBottom: 4,
    },
    heroTagline: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.85)",
        textAlign: "center",
    },
    sectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
        letterSpacing: 0.3,
    },
    bodyText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    featureList: {
        gap: 14,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    featureIcon: {
        marginTop: 2,
        marginRight: 10,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureItemTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    featureItemDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    bulletList: {
        gap: 10,
    },
    bulletText: {
        fontFamily: fonts.body.regular,
        fontSize: 13.5,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    boldText: {
        fontFamily: fonts.heading.semiBold,
        color: theme.colors.textPrimary,
    },
    stepList: {
        gap: 16,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    stepNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        marginTop: 2,
    },
    stepNumberText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: "#FFFFFF",
    },
    stepTextWrap: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 14,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    stepDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    teamBox: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    teamGroup: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.primary,
        marginBottom: 2,
    },
    teamRole: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: theme.colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    teamDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 19,
    },
    emailButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginTop: 14,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    emailButtonText: {
        fontFamily: fonts.heading.bold,
        fontSize: 14,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
