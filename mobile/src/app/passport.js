import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    ArrowLeft,
    CheckCircle2,
    MapPin,
    Lock,
    Building2,
    Check,
    Search,
} from "lucide-react-native";
import { router } from "expo-router";
import { api } from "../services";
import theme from "../theme/tokens";
import { useAuth } from "../hooks/useAuth";
import { fonts } from "../constants/typography";

export default function PassportScreen() {
    const { user } = useAuth();
    const [buildings, setBuildings] = useState([]);
    const [unlockedIds, setUnlockedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all"); // 'all' | 'visited' | 'unvisited'

    const fetchData = async () => {
        try {
            const [buildingsRes, unlockedRes] = await Promise.all([
                api.get("/api/buildings/"),
                api.get("/api/buildings/unlocked/"),
            ]);

            if (buildingsRes.data.success) {
                setBuildings(buildingsRes.data.data);
            }
            if (unlockedRes.data.success) {
                const unlocked = new Set(
                    unlockedRes.data.data
                        .filter((b) => b.visited !== false)
                        .map((b) => b.id),
                );
                setUnlockedIds(unlocked);
            }
        } catch (error) {
            console.error("Failed to fetch passport data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const unlockedCount = buildings.filter((b) => unlockedIds.has(b.id)).length;
    const totalCount = buildings.length;
    const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    const filteredBuildings = useMemo(() => {
        const sorted = [...buildings].sort((a, b) => {
            const aUnlocked = unlockedIds.has(a.id);
            const bUnlocked = unlockedIds.has(b.id);
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return (a.name || "").localeCompare(b.name || "");
        });

        if (filter === "visited") {
            return sorted.filter((b) => unlockedIds.has(b.id));
        }
        if (filter === "unvisited") {
            return sorted.filter((b) => !unlockedIds.has(b.id));
        }
        return sorted;
    }, [buildings, unlockedIds, filter]);

    const isProfessional = user?.role === "professional" || user?.role === "admin";

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
                <Text style={styles.headerTitle}>
                    {isProfessional ? "Visited Buildings" : "Campus Passport"}
                </Text>
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
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTitle}>
                            {isProfessional ? "EVALUATION SUMMARY" : "EXPLORATION PROGRESS"}
                        </Text>
                        <Text style={styles.progressCount}>
                            {unlockedCount} / {totalCount} ({Math.round(progress)}%)
                        </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progress}%` },
                            ]}
                        />
                    </View>

                    <Text style={styles.progressSubtext}>
                        {unlockedCount === totalCount && totalCount > 0
                            ? isProfessional
                                ? "All campus facilities have been visited & evaluated!"
                                : "Congratulations! You have discovered all campus buildings!"
                            : isProfessional
                              ? `${totalCount - unlockedCount} remaining building(s) left to inspect.`
                              : `Walk near ${totalCount - unlockedCount} more building(s) to complete your passport.`}
                    </Text>
                </View>

                {/* Filter Pills */}
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            filter === "all" && styles.filterPillActive,
                        ]}
                        onPress={() => setFilter("all")}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                filter === "all" && styles.filterPillTextActive,
                            ]}
                        >
                            All ({totalCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            filter === "visited" && styles.filterPillActive,
                        ]}
                        onPress={() => setFilter("visited")}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                filter === "visited" && styles.filterPillTextActive,
                            ]}
                        >
                            Visited ({unlockedCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterPill,
                            filter === "unvisited" && styles.filterPillActive,
                        ]}
                        onPress={() => setFilter("unvisited")}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.filterPillText,
                                filter === "unvisited" && styles.filterPillTextActive,
                            ]}
                        >
                            Unvisited ({totalCount - unlockedCount})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Grid */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="large"
                            color={theme.colors.primary}
                        />
                    </View>
                ) : filteredBuildings.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Building2 size={40} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
                        <Text style={styles.emptyTitle}>No Buildings Found</Text>
                        <Text style={styles.emptySubtext}>
                            {filter === "visited"
                                ? "You have not visited any buildings yet."
                                : "All buildings have been visited!"}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {filteredBuildings.map((building) => {
                            const isUnlocked = unlockedIds.has(building.id);
                            return (
                                <View
                                    key={building.id}
                                    style={[
                                        styles.stampCard,
                                        isUnlocked
                                            ? styles.stampCardUnlocked
                                            : styles.stampCardLocked,
                                    ]}
                                >
                                    <View style={styles.imageContainer}>
                                        {building.image_url ? (
                                            <Image
                                                source={{
                                                    uri: building.image_url,
                                                }}
                                                style={[
                                                    styles.buildingImage,
                                                    !isUnlocked && styles.buildingImageLocked,
                                                ]}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.placeholderImage}>
                                                <Building2
                                                    size={28}
                                                    color={isUnlocked ? theme.colors.primary : theme.colors.textMuted}
                                                />
                                            </View>
                                        )}

                                        {/* Status Badge */}
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                isUnlocked
                                                    ? styles.statusBadgeUnlocked
                                                    : styles.statusBadgeLocked,
                                            ]}
                                        >
                                            {isUnlocked ? (
                                                <>
                                                    <Check size={10} color="#059669" style={{ marginRight: 2 }} />
                                                    <Text style={styles.statusBadgeTextUnlocked}>VISITED</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Lock size={10} color={theme.colors.textMuted} style={{ marginRight: 2 }} />
                                                    <Text style={styles.statusBadgeTextLocked}>LOCKED</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <Text
                                            style={[
                                                styles.buildingName,
                                                !isUnlocked && styles.buildingNameLocked,
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {building.name}
                                        </Text>
                                        <View style={styles.codeRow}>
                                            <Text
                                                style={[
                                                    styles.buildingCode,
                                                    !isUnlocked && styles.buildingCodeLocked,
                                                ]}
                                            >
                                                {building.code || "CAMPUS"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

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
    progressCard: {
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
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    progressTitle: {
        fontFamily: fonts.heading.bold,
        color: "#594040",
        fontSize: 11.5,
        letterSpacing: 0.8,
    },
    progressCount: {
        fontFamily: fonts.heading.bold,
        color: theme.colors.primary,
        fontSize: 13.5,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 10,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: theme.colors.primary,
        borderRadius: 6,
    },
    progressSubtext: {
        fontFamily: fonts.body.regular,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    filterPill: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    filterPillActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterPillText: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    filterPillTextActive: {
        color: "#FFFFFF",
    },
    loadingContainer: {
        padding: 40,
        alignItems: "center",
    },
    emptyContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: fonts.heading.bold,
        fontSize: 15,
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    emptySubtext: {
        fontFamily: fonts.body.regular,
        fontSize: 12.5,
        color: theme.colors.textMuted,
        textAlign: "center",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    stampCard: {
        width: "48.5%",
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 3,
        elevation: 1,
    },
    stampCardUnlocked: {
        borderColor: "#E5E7EB",
    },
    stampCardLocked: {
        borderColor: "#E5E7EB",
        opacity: 0.75,
    },
    imageContainer: {
        width: "100%",
        height: 100,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    buildingImage: {
        width: "100%",
        height: "100%",
    },
    buildingImageLocked: {
        opacity: 0.35,
    },
    placeholderImage: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    statusBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusBadgeUnlocked: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderWidth: 1,
        borderColor: "rgba(16, 185, 129, 0.3)",
    },
    statusBadgeLocked: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statusBadgeTextUnlocked: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        color: "#059669",
        letterSpacing: 0.4,
    },
    statusBadgeTextLocked: {
        fontFamily: fonts.heading.bold,
        fontSize: 9,
        color: theme.colors.textMuted,
        letterSpacing: 0.4,
    },
    cardFooter: {
        padding: 10,
        backgroundColor: "#FFFFFF",
    },
    buildingName: {
        fontFamily: fonts.heading.semiBold,
        fontSize: 12.5,
        color: theme.colors.textPrimary,
        lineHeight: 16,
        marginBottom: 4,
        minHeight: 32,
    },
    buildingNameLocked: {
        color: theme.colors.textSecondary,
    },
    codeRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    buildingCode: {
        fontFamily: fonts.heading.bold,
        fontSize: 10,
        color: theme.colors.primary,
        letterSpacing: 0.5,
    },
    buildingCodeLocked: {
        color: theme.colors.textMuted,
    },
});
