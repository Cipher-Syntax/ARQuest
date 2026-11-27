import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Award, CheckCircle2, X } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { getDisplayName, getRankDetails } from "../../utils/leaderboard";
import StudentAvatar from "./StudentAvatar";
import { useLeaderboardStyles } from "./leaderboardStyles";

/** Read-only public profile for a ranked student. */
export default function StudentDetailModal({ student, onClose }) {
    const colors = useThemeColors();
    const styles = useLeaderboardStyles();
    const details = getRankDetails(student.points, student.rank_info);

    return (
        <Modal
            visible={Boolean(student)}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    onPress={onClose}
                    activeOpacity={1}
                />
                <View style={styles.modalCard}>
                    {/* Modal Close */}
                    <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={18} color="#64748B" />
                    </TouchableOpacity>

                    {/* Avatar & Rank Ring */}
                    <View style={styles.modalAvatarContainer}>
                        <StudentAvatar student={student} size={76} borderColor={colors.primary} />
                        <View style={styles.modalRankPill}>
                            <Text style={styles.modalRankPillText}>
                                RANK #{student.rank || "—"}
                            </Text>
                        </View>
                    </View>

                    {/* Student Name & Username */}
                    <Text style={styles.modalStudentName} numberOfLines={1}>
                        {getDisplayName(student)}
                    </Text>
                    <Text style={styles.modalUsername}>
                        @{student.username}
                    </Text>

                    {/* Rank Tier Banner */}
                    <View style={[styles.modalTierBanner, { backgroundColor: details.bg, borderColor: details.border }]}>
                        <Text style={{ fontSize: 18 }}>{details.icon}</Text>
                        <View>
                            <Text style={[styles.modalTierTitle, { color: details.color }]}>
                                Level {details.level} · {details.title}
                            </Text>
                            {details.nextRankExp ? (
                                <Text style={styles.modalTierProgressText}>
                                    {student.points} / {details.nextRankExp} XP to next rank
                                </Text>
                            ) : (
                                <Text style={styles.modalTierProgressText}>
                                    Maximum Tier Reached! 👑
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Progress Track */}
                    <View style={styles.modalProgressTrack}>
                        <View
                            style={[
                                styles.modalProgressFill,
                                { width: `${details.progress}%`, backgroundColor: details.color },
                            ]}
                        />
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.modalStatsGrid}>
                        <View style={styles.modalStatItem}>
                            <Award size={18} color={colors.primary} style={{ marginBottom: 4 }} />
                            <Text style={styles.modalStatValue}>{student.points.toLocaleString()}</Text>
                            <Text style={styles.modalStatLabel}>TOTAL EXP</Text>
                        </View>
                        <View style={styles.modalStatItem}>
                            <CheckCircle2 size={18} color="#16A34A" style={{ marginBottom: 4 }} />
                            <Text style={styles.modalStatValue}>
                                {student.quests_completed || 0}
                            </Text>
                            <Text style={styles.modalStatLabel}>QUESTS DONE</Text>
                        </View>
                    </View>

                    {/* Dismiss button */}
                    <TouchableOpacity
                        style={styles.modalDoneBtn}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.modalDoneBtnText}>CLOSE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
