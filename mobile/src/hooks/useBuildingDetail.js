import { useRef, useState } from "react";

import { router } from "expo-router";
import {
    isBuildingAccessible,
    buildSelectedBuildingData,
    hasBuildingModel,
    getBuildingModelUrl,
} from "../utils/buildings";

/**
 * Owns the Building Detail modal state and actions.
 * Presentation stays in components/buildings/BuildingDetailModal.js
 */
export function useBuildingDetail({
    unlockedBuildings,
    role,
    canAccessBuildingFeatures,
    canView3D,
    canViewPanorama,
    enable_trivia,
    onClose,
}) {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [controlPickerVisible, setControlPickerVisible] = useState(false);
    const [quizModalVisible, setQuizModalVisible] = useState(false);
    const [quizBuilding, setQuizBuilding] = useState(null);

    // Ref to persist building data for async navigation (virtual tour)
    const selectedBuildingRef = useRef(null);

    const openBuildingDetail = (building) => {
        const accessible = isBuildingAccessible(building, unlockedBuildings, role);
        if (accessible) {
            const buildingData = buildSelectedBuildingData(building, unlockedBuildings);
            setSelectedBuilding(buildingData);
            selectedBuildingRef.current = buildingData;
            setModalVisible(true);
        } else {
            onClose?.("locked", building);
        }
    };

    const closeBuildingDetail = () => {
        setModalVisible(false);
        setSelectedBuilding(null);
        // Don't clear ref immediately - needed for virtual tour navigation
    };

    const handleView3D = () => {
        const building = selectedBuildingRef.current;
        const modelUrl = getBuildingModelUrl(building);
        if (!modelUrl || !building) {
            onClose?.("no_model", building);
            return;
        }
        closeBuildingDetail();
        router.push({
            pathname: "/building-3d-viewer",
            params: {
                buildingId: building.id,
                buildingName: building.name,
                buildingDescription: building.description,
                modelUrl: building.model_url,
                modelVersion: building.model_version,
            },
        });
    };

    const handleVirtualTour = () => {
        // Don't close modal yet - need building data for launchVirtualTour
        setControlPickerVisible(true);
    };

    const launchVirtualTour = (controlMode) => {
        setControlPickerVisible(false);
        const building = selectedBuildingRef.current;
        if (!building) return;
        closeBuildingDetail(); // Now clear after capturing building
        router.push({
            pathname: "/virtual-tour-viewer",
            params: {
                buildingId: building.id,
                buildingName: building.name,
                modelUrl: building.model_url,
                modelVersion: building.model_version,
                hotspots: JSON.stringify(building.hotspots || []),
                controlMode: controlMode,
            },
        });
    };

    const handleViewPanorama = () => {
        const building = selectedBuildingRef.current;
        if (!building) return;
        closeBuildingDetail();
        router.push({
            pathname: "/panorama-viewer",
            params: {
                buildingId: building.id,
                buildingName: building.name,
            },
        });
    };

    const handleTakeQuiz = () => {
        // Store building in quizBuilding state for quiz modal
        const building = selectedBuildingRef.current;
        if (building) {
            setQuizBuilding(building);
        }
        setQuizModalVisible(true);
    };

    const closeQuizModal = () => {
        setQuizModalVisible(false);
        setQuizBuilding(null);
        // Clear building ref after quiz is fully closed
        selectedBuildingRef.current = null;
        setSelectedBuilding(null);
    };

    const selectedBuildingHasModel = hasBuildingModel(selectedBuilding);
    const selectedBuildingModelUrl = getBuildingModelUrl(selectedBuilding);
    const canAccessFeatures = canAccessBuildingFeatures(true);

    return {
        // State
        modalVisible,
        selectedBuilding,
        controlPickerVisible,
        setControlPickerVisible,
        quizModalVisible,
        closeQuizModal,
        // Derived
        selectedBuildingHasModel,
        selectedBuildingModelUrl,
        canAccessFeatures,
        // Building for quiz (persists after modal closes)
        quizBuilding,
        // Handlers
        openBuildingDetail,
        closeBuildingDetail,
        handleView3D,
        handleVirtualTour,
        launchVirtualTour,
        handleViewPanorama,
        handleTakeQuiz,
    };
}

export default useBuildingDetail;