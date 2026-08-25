import React, { useState, useEffect } from 'react';
import { 
    ViroARScene, 
    Viro3DObject, 
    ViroAmbientLight, 
    ViroPolyline, 
    ViroMaterials, 
    ViroNode, 
    ViroText, 
    ViroAnimations 
} from '@viro-community/react-viro';
import { gpsToARCoordinates } from '../../utils/geo-ar';

export default function ARQuestScene(props) {
    const { sceneNavigator } = props;
    // Extract props passed from the ARScreen
    const { 
        targetLat, 
        targetLng, 
        userLat, 
        userLng, 
        userHeading, 
        modelUrl, 
        nextWaypoint,
        buildingName 
    } = sceneNavigator.viroAppProps;

    const [buildingPos, setBuildingPos] = useState({ x: 0, y: 0, z: -10 });
    const [navArrowPos, setNavArrowPos] = useState(null);

    // Update positions whenever GPS or Compass changes
    useEffect(() => {
        if (targetLat && targetLng && userLat && userLng) {
            const pos = gpsToARCoordinates(userLat, userLng, targetLat, targetLng, userHeading);
            
            // Limit distance to prevent rendering it miles away if far, 
            // clamp to max 50 meters for visibility, or allow true scale if desired.
            // For now, render exactly where it is.
            setBuildingPos(pos);
        }

        if (nextWaypoint && userLat && userLng) {
            const arrowPos = gpsToARCoordinates(
                userLat, 
                userLng, 
                nextWaypoint.latitude, 
                nextWaypoint.longitude, 
                userHeading
            );
            // Lock the Y axis to the ground for the navigation path
            setNavArrowPos({ x: arrowPos.x, y: -1.5, z: arrowPos.z });
        } else {
            setNavArrowPos(null);
        }
    }, [userLat, userLng, userHeading, targetLat, targetLng, nextWaypoint]);

    return (
        <ViroARScene>
            <ViroAmbientLight color={"#ffffff"} intensity={1000} />
            
            {/* Render Building Model anchored in real world */}
            {modelUrl && (
                <ViroNode position={[buildingPos.x, 0, buildingPos.z]} animation={{ name: "hover", run: true, loop: true }}>
                    <ViroText 
                        text={buildingName || "Target"} 
                        scale={[2, 2, 2]} 
                        position={[0, 4, 0]} 
                        style={{ fontFamily: "Arial", fontSize: 24, color: "#FFFFFF" }} 
                        extrusionDepth={2}
                        materials={["textMaterial"]}
                    />
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        position={[0, 0, 0]}
                        scale={[1, 1, 1]} // Use true scale or adjust based on your models
                        type="GLB"
                        onError={(e) => console.log("AR Model Load Error:", e)}
                    />
                </ViroNode>
            )}

            {/* Render Navigation Arrow/Path on the ground */}
            {navArrowPos && (
                <ViroNode position={[0, -1.5, -0.5]}>
                    <ViroPolyline
                        position={[0, 0, 0]}
                        points={[
                            [0, 0, 0],
                            [navArrowPos.x, 0, navArrowPos.z] // Draw line from user's feet to next waypoint
                        ]}
                        thickness={0.2}
                        materials={["glowArrow"]}
                    />
                </ViroNode>
            )}
        </ViroARScene>
    );
}

// AR Materials and Animations
ViroMaterials.createMaterials({
    glowArrow: {
        diffuseColor: "#B21830", // WMSU Crimson
        lightingModel: "Constant",
    },
    textMaterial: {
        diffuseColor: "#208AEF", // System Blue
    }
});

ViroAnimations.registerAnimations({
    hover: {
        properties: {
            positionY: "+=0.2"
        },
        duration: 1000,
        easing: "EaseInEaseOut",
        direction: "Alternate",
    }
});
