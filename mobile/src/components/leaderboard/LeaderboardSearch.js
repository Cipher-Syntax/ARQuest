import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Search, X } from "lucide-react-native";

import { useLeaderboardStyles } from "./leaderboardStyles";

/** Search field plus the three quick filter pills. */
export default function LeaderboardSearch({
    searchTerm,
    onChangeSearch,
    activeFilter,
    onSelectFilter,
    totalCount,
}) {
    const styles = useLeaderboardStyles();

    return (
        <>
            <View style={styles.searchBar}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search student by name or rank..."
                    placeholderTextColor="#94A3B8"
                    value={searchTerm}
                    onChangeText={onChangeSearch}
                    autoCapitalize="none"
                />
                {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => onChangeSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color="#64748B" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.filterPillsRow}>
                <TouchableOpacity
                    style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
                    onPress={() => onSelectFilter("all")}
                >
                    <Text style={[styles.filterPillText, activeFilter === "all" && styles.filterPillTextActive]}>
                        All Explorers ({totalCount})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterPill, activeFilter === "above_avg" && styles.filterPillActive]}
                    onPress={() => onSelectFilter("above_avg")}
                >
                    <Text style={[styles.filterPillText, activeFilter === "above_avg" && styles.filterPillTextActive]}>
                        Above Average
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterPill, activeFilter === "legends" && styles.filterPillActive]}
                    onPress={() => onSelectFilter("legends")}
                >
                    <Text style={[styles.filterPillText, activeFilter === "legends" && styles.filterPillTextActive]}>
                        Legends (≥2k)
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
}
