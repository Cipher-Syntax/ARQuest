import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Image,
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
    Briefcase,
    Palette,
    Code2,
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
                    <ArrowLeft size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About ARQuest</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Official App Branding Hero Card */}
                <LinearGradient
                    colors={["#9b1b30", "#6b101f"]}
                    style={styles.heroCard}
                >
                    <Image
                        source={require("../../assets/images/logo.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.heroTitle}>ARQuest</Text>
                    <Text style={styles.heroTagline}>
                        Campus Navigation & Accreditation System
                    </Text>
                </LinearGradient>

                {/* 1. What is ARQuest? */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Compass size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>What is ARQuest?</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        ARQuest is an interactive campus navigation and evaluation system. It blends GPS geofencing, Augmented Reality (AR), 3D building models, and 360° virtual walkthroughs to help students, accreditors, and visitors discover and explore campus facilities.
                    </Text>
                </View>

                {/* 2. Our Purpose */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Target size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Our Purpose</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        Traditional static maps can be confusing and hard to navigate. ARQuest was created to eliminate campus wayfinding confusion, provide interactive student missions, and offer accreditors a comprehensive tool to evaluate physical facilities remotely or in-person.
                    </Text>
                </View>

                {/* 3. What You Can Do */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Layers size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>What You Can Do</Text>
                    </View>
                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIconWrap}>
                                <MapPin size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Explore the Campus</Text>
                                <Text style={styles.featureItemDesc}>
                                    View your live GPS position on the 2D map, locate department offices, and calculate walking distances.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconWrap}>
                                <ScanLine size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Use the AR Camera</Text>
                                <Text style={styles.featureItemDesc}>
                                    Spot floating building names, distance waypoints, and scan entrance QR codes for verification.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconWrap}>
                                <Eye size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Inspect 3D & 360° Tours</Text>
                                <Text style={styles.featureItemDesc}>
                                    Rotate 3D structural models and step inside panoramic 360° virtual rooms for remote inspection.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconWrap}>
                                <Sparkles size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Complete Missions & Quizzes</Text>
                                <Text style={styles.featureItemDesc}>
                                    Solve daily objectives, take building quizzes, maintain daily streaks, and earn player badges.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconWrap}>
                                <CheckCircle2 size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureItemTitle}>Track Visited Buildings</Text>
                                <Text style={styles.featureItemDesc}>
                                    Keep an organized stamp checklist of every campus facility you have explored or evaluated.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Key Features */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <ShieldCheck size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Key Features</Text>
                    </View>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>GPS Geofencing:</Text> Automatically unlocks building content when you enter facility boundaries.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>3D Model Viewer:</Text> Smooth 3D structural models with rotation and zoom inspection.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>360° Virtual Walkthroughs:</Text> High-resolution panoramic room tours with scene hotspots.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>Role-Based Access Control (RBAC):</Text> Custom interfaces for Students, Accreditors, Visitors, and Admins.
                        </Text>
                        <Text style={styles.bulletText}>
                            • <Text style={styles.boldText}>QR Code Verification:</Text> Quick entrance verification to unlock facility checkpoints.
                        </Text>
                    </View>
                </View>

                {/* 5. How It Works */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <BookOpen size={18} color={theme.colors.primary} />
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
                                    Log in to your account or explore as a Visitor to access features tailored to your role.
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
                                    GPS tracks your position and calculates real-time distances to all campus buildings.
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
                                    Walking near a building triggers automatic unlocking, displaying 3D models and trivia.
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
                                    Point your AR camera, answer quizzes for EXP, or conduct structured facility evaluations.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 6. Meet the Team */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Users size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Meet the Team</Text>
                    </View>

                    <View style={styles.teamHeaderBox}>
                        <View style={styles.teamTitleRow}>
                            <Text style={styles.teamGroup}>Team Spiral</Text>
                            <View style={styles.teamPill}>
                                <Text style={styles.teamPillText}>BSIT 2026–2027</Text>
                            </View>
                        </View>
                        <Text style={styles.teamDesc}>
                            College of Computer Studies • Capstone Research & Development
                        </Text>
                    </View>

                    <View style={styles.memberList}>
                        {/* Member 1: Hannah Jean T. Balimbingan */}
                        <View style={styles.memberCard}>
                            <View style={[styles.memberIconWrap, { backgroundColor: "rgba(155, 27, 48, 0.08)" }]}>
                                <Briefcase size={16} color={theme.colors.primary} />
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>Balimbingan, Hannah Jean T.</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>Project Manager</Text>
                                </View>
                            </View>
                        </View>

                        {/* Member 2: Paolo A. Eijansantos */}
                        <View style={styles.memberCard}>
                            <View style={[styles.memberIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.08)" }]}>
                                <Palette size={16} color="#2563EB" />
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>Eijansantos, Paolo A.</Text>
                                <View style={[styles.roleBadge, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                                    <Text style={[styles.roleBadgeText, { color: "#1D4ED8" }]}>UI/UX</Text>
                                </View>
                            </View>
                        </View>

                        {/* Member 3: Justine A. Toong */}
                        <View style={styles.memberCard}>
                            <View style={[styles.memberIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.08)" }]}>
                                <Code2 size={16} color="#059669" />
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>Toong, Justine A.</Text>
                                <View style={[styles.roleBadge, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                                    <Text style={[styles.roleBadgeText, { color: "#047857" }]}>Lead Developer</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 7. Contact & Support */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIconWrap}>
                            <Mail size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Contact & Support</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        Have questions, suggestions, or need assistance? Feel free to reach out to our team:
                    </Text>
                    <TouchableOpacity
                        style={styles.emailButton}
                        onPress={handleEmail}
                        activeOpacity={0.85}
                    >
                        <Mail size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.emailButtonText}>support@arquest.com</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 32 }} />
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
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.textPrimary,
        letterSpacing: 0.3,
    },
    scrollContent: {
        padding: 16,
    },
    heroCard: {
        borderRadius: 6,
        paddingVertical: 28,
        paddingHorizontal: 16,
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#9b1b30",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    logoImage: {
        width: 140,
        height: 140,
        marginBottom: 8,
    },
    heroTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 24,
        color: "#FFFFFF",
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    heroTagline: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
    },
    sectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    sectionTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 15,
        color: theme.colors.textPrimary,
        letterSpacing: 0.2,
    },
    bodyText: {
        fontFamily: fonts.body.regular,
        fontSize: 13.5,
        color: theme.colors.textSecondary,
        lineHeight: 21,
    },
    featureList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    featureIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: "rgba(155, 27, 48, 0.06)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureItemTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 13.5,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    featureItemDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 12.5,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    bulletList: {
        gap: 8,
    },
    bulletText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 19,
    },
    boldText: {
        fontFamily: fonts.heading.semiBold,
        color: theme.colors.textPrimary,
    },
    stepList: {
        gap: 14,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    stepNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        marginTop: 2,
    },
    stepNumberText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#FFFFFF",
    },
    stepTextWrap: {
        flex: 1,
    },
    stepTitle: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 13.5,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    stepDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 12.5,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    teamHeaderBox: {
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    teamTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    teamGroup: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.primary,
    },
    teamPill: {
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: "rgba(155, 27, 48, 0.15)",
    },
    teamPillText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 0.4,
    },
    teamDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    memberList: {
        marginTop: 10,
        gap: 8,
    },
    memberCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    memberIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 13,
        color: theme.colors.textPrimary,
        marginBottom: 3,
    },
    roleBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(155, 27, 48, 0.08)",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    roleBadgeText: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 0.2,
    },
    emailButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginTop: 12,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    emailButtonText: {
        fontFamily: fonts.heading.bold,
        fontSize: 13.5,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
