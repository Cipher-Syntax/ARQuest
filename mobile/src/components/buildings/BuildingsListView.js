import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { filterBuildingsByQuery, sortBuildingsByAvailability, getItemLayout } from "../../utils/buildings";

/**
 * List View: search bar + FlatList of buildings.
 * Receives sorted buildings and handles item press → opens detail modal.
 */
const BuildingListItem = React.memo(({ item, isUnlocked, isVisitor, isLast, onPress, styles, colors }) => {
    return (
        <TouchableOpacity
            style={{
                padding: 12,
                backgroundColor: "#FFF",
                flexDirection: "row",
                alignItems: "center",
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: "#E5E7EB",
                height: 85,
            }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.buildingListImage}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                ) : (
                    <Ionicons name="business" size={24} color={colors.textMuted} />
                )}
            </View>
            <View style={styles.buildingListInfo}>
                <Text style={styles.buildingListName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.buildingListMeta} numberOfLines={1}>
                    {item.primary_department ? `${item.primary_department.name} • ` : ""}
                    {item.is_active === false ? "CLOSED" : item.status === "MAINTENANCE" ? "MAINTENANCE" : "AVAILABLE"}
                </Text>
            </View>
            <Ionicons
                name={isUnlocked || isVisitor ? "chevron-forward" : "lock-closed"}
                size={20}
                color={isUnlocked || isVisitor ? colors.primary : colors.textMuted}
            />
        </TouchableOpacity>
    );
});

BuildingListItem.displayName = "BuildingListItem";

export function BuildingsListView({
    allBuildings,
    unlockedBuildings,
    role,
    listSearchQuery,
    setListSearchQuery,
    viewMode,
    onPressBuilding,
    styles,
    colors,
}) {
    const sortedBuildings = sortBuildingsByAvailability(allBuildings, unlockedBuildings, role);

    const filteredBuildings = filterBuildingsByQuery(sortedBuildings, listSearchQuery);

    const renderItem = React.useCallback(
        ({ item, index }) => {
            const isUnlocked = unlockedBuildings.some((u) => u.id === item.id);
            const isLast = index === filteredBuildings.length - 1;
            return (
                <BuildingListItem
                    item={item}
                    isUnlocked={isUnlocked}
                    isVisitor={role === "visitor"}
                    isLast={isLast}
                    onPress={() => onPressBuilding(item)}
                    styles={styles}
                    colors={colors}
                />
            );
        },
        [unlockedBuildings, role, filteredBuildings.length, onPressBuilding, styles, colors],
    );

    const getItemLayoutFn = React.useCallback(
        (data, index) => getItemLayout(data, index),
        [],
    );

    if (viewMode !== "list") {
        return null;
    }

    return (
        <View style={{ flex: 1, paddingTop: 110, paddingHorizontal: 16 }}>
            <View style={styles.listSearchBar}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.listSearchIcon} />
                <TextInput
                    style={styles.listSearchInput}
                    placeholder="Search buildings..."
                    placeholderTextColor={colors.textMuted}
                    value={listSearchQuery}
                    onChangeText={setListSearchQuery}
                />
                {listSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setListSearchQuery("")}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                data={filteredBuildings}
                keyExtractor={(b) => b.id.toString()}
                contentContainerStyle={{ paddingBottom: 100 }}
                removeClippedSubviews={true}
                maxToRenderPerBatch={6}
                updateCellsBatchingPeriod={50}
                initialNumToRender={6}
                windowSize={5}
                getItemLayout={getItemLayoutFn}
                renderItem={renderItem}
            />
        </View>
    );
}

export default BuildingsListView;