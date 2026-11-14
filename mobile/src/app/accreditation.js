import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Award,
    ShieldCheck,
    ShieldAlert,
    CalendarDays,
    FileText,
    ClipboardCheck,
    AlertTriangle,
    Lightbulb,
    Building2,
    CheckCircle2,
    XCircle,
    MinusCircle,
    CircleSlash,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../services";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";
import { useAuth } from "../hooks/useAuth";

const CHECKLIST_TONES = {
    COMPLIANT: {
        color: "#059669",
        background: "#ECFDF5",
        border: "#A7F3D0",
        Icon: CheckCircle2,
    },
    PARTIAL: {
        color: "#B45309",
        background: "#FFFBEB",
        border: "#FDE68A",
        Icon: MinusCircle,
    },
    NON_COMPLIANT: {
        color: "#B91C1C",
        background: "#FEF2F2",
        border: "#FECACA",
        Icon: XCircle,
    },
    NOT_APPLICABLE: {
        color: "#6B7280",
        background: "#F9FAFB",
        border: "#E5E7EB",
        Icon: CircleSlash,
    },
};

const scoreTone = (score) => {
    if (score === null || score === undefined) return theme.colors.textMuted;
    if (score >= 80) return "#059669";
    if (score >= 50) return "#B45309";
    return theme.colors.error;
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

const DetailRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
        <View style={styles.detailRow}>
            <Icon size={15} color={theme.colors.textMuted} />
            <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
            </View>
        </View>
    );
};

const SectionCard = ({ icon: Icon, title, children }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Icon size={17} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

export default function AccreditationScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const [building, setBuilding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const isProfessional = user?.role === "professional" || user?.role === "admin";

    const fetchBuilding = useCallback(async () => {
        if (!id) {
            setError("No building was selected.");
            setLoading(false);
            return;
        }
        try {
            setError("");
            const response = await api.get(`/api/buildings/${id}/`);
            setBuilding(response.data?.data || null);
        } catch (err) {
            setError(
                err?.response?.data?.error?.message ||
                    "Unable to load the accreditation record."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchBuilding();
    }, [fetchBuilding]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBuilding();
    };

    const accreditation = building?.accreditation;
    const checklist = accreditation?.checklist || [];
    const programs = accreditation?.programs || [];
    const score = accreditation?.compliance_score;

    const renderBody = () => {
        if (loading) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        if (!isProfessional) {
            return (
                <View style={styles.centered}>
                    <ShieldAlert size={40} color={theme.colors.error} />
                    <Text style={styles.stateTitle}>Restricted Access</Text>
                    <Text style={styles.stateText}>
                        Accreditation records are available to accreditors and
                        administrators only.
                    </Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centered}>
                    <AlertTriangle size={40} color={theme.colors.error} />
                    <Text style={styles.stateTitle}>Could Not Load Record</Text>
                    <Text style={styles.stateText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setLoading(true);
                            fetchBuilding();
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!accreditation) {
            return (
                <View style={styles.centered}>
                    <ShieldCheck size={40} color={theme.colors.textMuted} />
                    <Text style={styles.stateTitle}>Accreditation Unavailable</Text>
                    <Text style={styles.stateText}>
                        Accreditation access is currently turned off by the
                        administrator.
                    </Text>
                </View>
            );
        }

        if (accreditation.status === "NOT_SET" && checklist.length === 0) {
            return (
                <View style={styles.centered}>
                    <FileText size={40} color={theme.colors.textMuted} />
                    <Text style={styles.stateTitle}>No Accreditation Data Yet</Text>
                    <Text style={styles.stateText}>
                        The administrator has not published accreditation data
                        for this building.
                    </Text>
                </View>
            );
        }

        return (
            <>
                {/* Summary */}
                <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroEyebrow}>ACCREDITATION STATUS</Text>
                            <Text style={styles.heroTitle}>
                                {accreditation.status_label || "Not Set"}
                            </Text>
                            {accreditation.level_label ? (
                                <View style={styles.levelPill}>
                                    <Award size={12} color={theme.colors.primary} />
                                    <Text style={styles.levelPillText}>
                                        {accreditation.level_label}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <View
                            style={[
                                styles.scoreBadge,
                                { borderColor: scoreTone(score) },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.scoreValue,
                                    { color: scoreTone(score) },
                                ]}
                            >
                                {score === null || score === undefined
                                    ? "—"
                                    : `${score}%`}
                            </Text>
                            <Text style={styles.scoreLabel}>COMPLIANT</Text>
                        </View>
                    </View>

                    {score !== null && score !== undefined ? (
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${score}%`,
                                        backgroundColor: scoreTone(score),
                                    },
                                ]}
                            />
                        </View>
                    ) : null}

                    {accreditation.accrediting_body ? (
                        <Text style={styles.heroMeta}>
                            Accredited by {accreditation.accrediting_body}
                        </Text>
                    ) : null}

                    <View style={styles.detailList}>
                        <DetailRow
                            icon={CalendarDays}
                            label="Valid Until"
                            value={formatDate(accreditation.valid_until)}
                        />
                        <DetailRow
                            icon={CalendarDays}
                            label="Evaluated On"
                            value={formatDate(accreditation.evaluated_at)}
                        />
                        <DetailRow
                            icon={ShieldCheck}
                            label="Evaluator"
                            value={accreditation.evaluator}
                        />
                        <DetailRow
                            icon={FileText}
                            label="Reference No."
                            value={accreditation.reference_no}
                        />
                    </View>
                </View>

                {/* Programs */}
                {programs.length > 0 ? (
                    <SectionCard icon={Building2} title="Programs Covered">
                        <View style={styles.chipRow}>
                            {programs.map((program, index) => (
                                <View key={`${program}-${index}`} style={styles.chip}>
                                    <Text style={styles.chipText}>{program}</Text>
                                </View>
                            ))}
                        </View>
                    </SectionCard>
                ) : null}

                {/* Checklist */}
                {checklist.length > 0 ? (
                    <SectionCard icon={ClipboardCheck} title="Compliance Checklist">
                        {checklist.map((item, index) => {
                            const tone =
                                CHECKLIST_TONES[item.status] ||
                                CHECKLIST_TONES.NOT_APPLICABLE;
                            const StatusIcon = tone.Icon;
                            return (
                                <View
                                    key={`${item.label}-${index}`}
                                    style={styles.checklistItem}
                                >
                                    <View style={styles.checklistMain}>
                                        <Text style={styles.checklistLabel}>
                                            {item.label}
                                        </Text>
                                        {item.remarks ? (
                                            <Text style={styles.checklistRemarks}>
                                                {item.remarks}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <View
                                        style={[
                                            styles.statusPill,
                                            {
                                                backgroundColor: tone.background,
                                                borderColor: tone.border,
                                            },
                                        ]}
                                    >
                                        <StatusIcon size={11} color={tone.color} />
                                        <Text
                                            style={[
                                                styles.statusPillText,
                                                { color: tone.color },
                                            ]}
                                        >
                                            {item.status_label || item.status}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </SectionCard>
                ) : null}

                {/* Findings */}
                {accreditation.findings ? (
                    <SectionCard icon={AlertTriangle} title="Findings">
                        <Text style={styles.bodyText}>
                            {accreditation.findings}
                        </Text>
                    </SectionCard>
                ) : null}

                {/* Recommendation */}
                {accreditation.recommendation ? (
                    <SectionCard icon={Lightbulb} title="Recommendation">
                        <Text style={styles.bodyText}>
                            {accreditation.recommendation}
                        </Text>
                    </SectionCard>
                ) : null}
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <ArrowLeft size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>Accreditation Record</Text>
                    {building?.name ? (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            {building.name}
                        </Text>
                    ) : null}
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
            >
                {renderBody()}
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
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
    },
    headerTitleWrap: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: theme.colors.textMuted,
        marginTop: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    centered: {
        flex: 1,
        minHeight: 360,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    stateTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 17,
        color: theme.colors.textPrimary,
        marginTop: 12,
        textAlign: "center",
    },
    stateText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 19,
        marginTop: 6,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 6,
        backgroundColor: theme.colors.primary,
    },
    retryText: {
        fontFamily: fonts.heading.bold,
        fontSize: 12,
        color: "#FFFFFF",
        letterSpacing: 0.4,
    },
    heroCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
    },
    heroTopRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    heroEyebrow: {
        fontFamily: fonts.hud.bold,
        fontSize: 10,
        letterSpacing: 1.1,
        color: theme.colors.textMuted,
    },
    heroTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    levelPill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: "rgba(178, 24, 48, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(178, 24, 48, 0.18)",
    },
    levelPillText: {
        fontFamily: fonts.heading.bold,
        fontSize: 11,
        color: theme.colors.primary,
    },
    scoreBadge: {
        minWidth: 76,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },
    scoreValue: {
        fontFamily: fonts.heading.bold,
        fontSize: 22,
    },
    scoreLabel: {
        fontFamily: fonts.hud.bold,
        fontSize: 8,
        letterSpacing: 0.8,
        color: theme.colors.textMuted,
        marginTop: 1,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: "#F3F4F6",
        overflow: "hidden",
        marginTop: 14,
    },
    progressFill: {
        height: "100%",
        borderRadius: 3,
    },
    heroMeta: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 10,
    },
    detailList: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 10,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    detailTextWrap: {
        flex: 1,
    },
    detailLabel: {
        fontFamily: fonts.hud.bold,
        fontSize: 9,
        letterSpacing: 0.7,
        color: theme.colors.textMuted,
        textTransform: "uppercase",
    },
    detailValue: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: theme.colors.textPrimary,
        marginTop: 1,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 12,
    },
    cardTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 13,
        color: theme.colors.textPrimary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    chip: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    chipText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        color: theme.colors.textPrimary,
    },
    checklistItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    checklistMain: {
        flex: 1,
    },
    checklistLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: theme.colors.textPrimary,
    },
    checklistRemarks: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 16,
    },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusPillText: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        letterSpacing: 0.3,
    },
    bodyText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});
