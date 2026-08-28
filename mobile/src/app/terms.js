import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ShieldCheck, MapPin, AlertTriangle } from "lucide-react-native";
import { router } from "expo-router";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";

export default function TermsScreen() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms and Conditions</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.contentCard}>
                    <Text style={styles.effectiveDate}>Effective Date: {new Date().toLocaleDateString()}</Text>
                    
                    <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
                    <Text style={styles.bodyText}>
                        By accessing or using the ARQuest mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the app.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Use of the App</Text>
                    <Text style={styles.bodyText}>
                        ARQuest provides campus navigation, augmented reality (AR) visualization, and facility evaluation tools. You agree to use these features responsibly and solely for their intended educational and administrative purposes.
                    </Text>

                    <Text style={styles.sectionTitle}>3. User Accounts</Text>
                    <Text style={styles.bodyText}>
                        Certain features are restricted based on your role (Student, Professional/Accreditor, Visitor). You are responsible for maintaining the confidentiality of your account credentials.
                    </Text>

                    <Text style={styles.sectionTitle}>4. Quests and App Content</Text>
                    <Text style={styles.bodyText}>
                        For student users, the app includes gamified elements like quests and leaderboards. These are intended for campus engagement. The developers reserve the right to modify or reset progression data during maintenance or new academic terms.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Acceptable Use</Text>
                    <Text style={styles.bodyText}>
                        You agree not to misuse the app, interfere with its operation, attempt unauthorized access to restricted features, or use the app to harass or harm others.
                    </Text>

                    <View style={styles.alertBox}>
                        <View style={styles.alertHeader}>
                            <AlertTriangle size={18} color={theme.colors.warning} />
                            <Text style={styles.alertTitle}>6. Location and Physical Safety</Text>
                        </View>
                        <Text style={styles.alertBody}>
                            ARQuest utilizes your device's Camera and GPS Location for Augmented Reality features and location-based discovery. When using these features:
                        </Text>
                        <Text style={styles.alertBullet}>• You must remain aware of your physical surroundings at all times.</Text>
                        <Text style={styles.alertBullet}>• You must NOT use the app while driving, operating machinery, crossing roads, or performing any activity where using a phone creates a safety risk.</Text>
                        <Text style={styles.alertBullet}>• The developers are not liable for any physical injury, property damage, or accidents resulting from distracted use of the application.</Text>
                    </View>

                    <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
                    <Text style={styles.bodyText}>
                        All 3D models, graphics, interface designs, and code within ARQuest are the intellectual property of the developers and the affiliated university. You may not extract or distribute these assets.
                    </Text>

                    <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
                    <Text style={styles.bodyText}>
                        The app relies on device APIs (such as Mapbox for maps and device location services). We do not control these underlying services and are not responsible for their individual downtimes.
                    </Text>

                    <Text style={styles.sectionTitle}>9. App Availability</Text>
                    <Text style={styles.bodyText}>
                        We strive for high availability, but ARQuest is provided "as is". We may update, suspend, or discontinue the app or any of its features at any time without prior notice.
                    </Text>

                    <Text style={styles.sectionTitle}>10. Disclaimer</Text>
                    <Text style={styles.bodyText}>
                        ARQuest is provided without warranties of any kind. We do not guarantee that the map data, distances, or 3D models are perfectly accurate to real-world measurements.
                    </Text>

                    <Text style={styles.sectionTitle}>11. Termination</Text>
                    <Text style={styles.bodyText}>
                        We reserve the right to terminate or suspend your access to the app immediately if you violate these Terms and Conditions.
                    </Text>

                    <Text style={styles.sectionTitle}>12. Changes to These Terms</Text>
                    <Text style={styles.bodyText}>
                        We may update these terms periodically. Continued use of the app after changes are published constitutes your acceptance of the new terms.
                    </Text>

                    <Text style={styles.sectionTitle}>13. Contact Us</Text>
                    <Text style={styles.bodyText}>
                        If you have any questions about these Terms, please contact us at support@arquest.com.
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
    bodyText: { fontFamily: fonts.body.regular, fontSize: 13.5, color: theme.colors.textSecondary, lineHeight: 22 },
    alertBox: {
        backgroundColor: "rgba(245, 124, 0, 0.08)", borderRadius: 6, padding: 16,
        borderWidth: 1, borderColor: "rgba(245, 124, 0, 0.3)", marginTop: 24, marginBottom: 8,
    },
    alertHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    alertTitle: { fontFamily: fonts.heading.bold, fontSize: 15, color: theme.colors.warning, marginLeft: 8 },
    alertBody: { fontFamily: fonts.body.regular, fontSize: 13.5, color: theme.colors.textPrimary, lineHeight: 20, marginBottom: 10 },
    alertBullet: { fontFamily: fonts.body.regular, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginLeft: 8, marginBottom: 4 },
});
