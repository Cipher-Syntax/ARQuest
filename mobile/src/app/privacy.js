import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ShieldAlert } from "lucide-react-native";
import { router } from "expo-router";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";

export default function PrivacyScreen() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.contentCard}>
                    <Text style={styles.effectiveDate}>Effective Date: {new Date().toLocaleDateString()}</Text>
                    
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.bodyText}>
                        Welcome to ARQuest. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application. We only process data required to make the core campus navigation and gamification features function.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                    <Text style={styles.bodyText}>
                        • Account Information: If you are an authenticated user (Student/Accreditor), we securely store your username, basic profile data, role, and progress data (badges, EXP, unlocked buildings).
                    </Text>
                    <Text style={styles.bodyText}>
                        • Location Data: We temporarily process your real-time device GPS coordinates to calculate distances to campus buildings and trigger geofence unlocks.
                    </Text>

                    <Text style={styles.sectionTitle}>3. How We Use Information</Text>
                    <Text style={styles.bodyText}>
                        • To authenticate your identity and assign appropriate role-based access.
                    </Text>
                    <Text style={styles.bodyText}>
                        • To display your live position on the campus map and calculate walking distances.
                    </Text>
                    <Text style={styles.bodyText}>
                        • To save your gamification progress (students) or facility evaluation history (accreditors).
                    </Text>

                    <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
                    <Text style={styles.bodyText}>
                        Your account data is stored securely on our backend servers. We use standard authentication protocols to secure your connection. Your live location data is processed locally on your device in real-time and is NOT continuously tracked, recorded, or saved to our servers history.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Information Sharing</Text>
                    <Text style={styles.bodyText}>
                        We do not sell, rent, or share your personal data with third-party advertisers or external organizations. Your profile progression may be visible to other students internally via the app's Leaderboard feature.
                    </Text>

                    <View style={styles.alertBox}>
                        <View style={styles.alertHeader}>
                            <ShieldAlert size={18} color={theme.colors.primary} />
                            <Text style={styles.alertTitle}>6. App Permissions</Text>
                        </View>
                        <Text style={styles.alertBody}>
                            To function properly, ARQuest requires the following device permissions:
                        </Text>
                        <Text style={styles.alertBullet}>• Camera: Used strictly for Augmented Reality (AR) wayfinding overlays and scanning QR codes. We do NOT record, save, or transmit your camera feed.</Text>
                        <Text style={styles.alertBullet}>• Location (GPS): Used to show your position on the map and unlock nearby building checkpoints. Location is processed while the app is actively in use.</Text>
                    </View>

                    <Text style={styles.sectionTitle}>7. User Rights</Text>
                    <Text style={styles.bodyText}>
                        You have the right to request the deletion of your account and associated data. Since location and camera permissions are controlled by your device, you may revoke them at any time through your phone's OS settings, though this will disable core app features.
                    </Text>

                    <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
                    <Text style={styles.bodyText}>
                        ARQuest is designed for university students, accreditors, and adult visitors. We do not knowingly collect personal data from children under the age of 13.
                    </Text>

                    <Text style={styles.sectionTitle}>9. Changes to the Privacy Policy</Text>
                    <Text style={styles.bodyText}>
                        We may update this policy periodically to reflect changes in our practices. We will notify you of any significant changes by updating the Effective Date at the top of this page.
                    </Text>

                    <Text style={styles.sectionTitle}>10. Contact Us</Text>
                    <Text style={styles.bodyText}>
                        If you have questions or concerns about this Privacy Policy or your data, please contact us at support@arquest.com.
                    </Text>
                </View>
                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFFFFF",
        borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
    },
    backButton: { width: 36, height: 36, borderRadius: 6, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
    headerTitle: { fontFamily: fonts.heading.bold, fontSize: 17, color: theme.colors.textPrimary, letterSpacing: 0.3 },
    scrollContent: { padding: 16 },
    contentCard: {
        backgroundColor: "#FFFFFF", borderRadius: 6, padding: 20,
        borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    },
    effectiveDate: { fontFamily: fonts.heading.semiBold, fontSize: 13, color: theme.colors.textMuted, marginBottom: 20 },
    sectionTitle: { fontFamily: fonts.heading.bold, fontSize: 15, color: theme.colors.textPrimary, marginTop: 24, marginBottom: 8 },
    bodyText: { fontFamily: fonts.body.regular, fontSize: 13.5, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 8 },
    alertBox: {
        backgroundColor: "rgba(155, 27, 48, 0.06)", borderRadius: 6, padding: 16,
        borderWidth: 1, borderColor: "rgba(155, 27, 48, 0.2)", marginTop: 24, marginBottom: 8,
    },
    alertHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    alertTitle: { fontFamily: fonts.heading.bold, fontSize: 15, color: theme.colors.primary, marginLeft: 8 },
    alertBody: { fontFamily: fonts.body.regular, fontSize: 13.5, color: theme.colors.textPrimary, lineHeight: 20, marginBottom: 10 },
    alertBullet: { fontFamily: fonts.body.regular, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginLeft: 8, marginBottom: 4 },
});
