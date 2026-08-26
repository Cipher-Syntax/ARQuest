import React, { useState, useEffect } from 'react';
import { 
    ViroARScene, 
    Viro3DObject, 
    ViroAmbientLight, 
    ViroPolyline, 
    ViroMaterials, 
    ViroNode, 
    ViroText, 
    ViroAnimations,
    ViroDirectionalLight 
} from '@reactvision/react-viro';
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
            let pos = gpsToARCoordinates(userLat, userLng, targetLat, targetLng, userHeading);
            
            // If they are inside the geofence, override GPS and showcase it as a miniature hologram in the center!
            if (Math.abs(pos.x) < 15 && Math.abs(pos.z) < 15) {
                // Place it directly at their feet (1.5 meters down to hit the floor, 1 meter forward)
                // Since the model is now extremely tiny, this forces them to look straight down at the roof!
                pos = { x: 0, y: -1.5, z: -1 }; 
            }
            
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
            <ViroDirectionalLight color="#ffffff" direction={[0, -1, -1]} castsShadow={true} shadowOpacity={0.4} />
            <ViroDirectionalLight color="#ffffff" direction={[1, 0, 1]} intensity={500} />
            <ViroDirectionalLight color="#ffffff" direction={[-1, 0, 1]} intensity={500} />
            <ViroDirectionalLight color="#ffffff" direction={[0, 1, 0]} intensity={500} />
            
            {/* Render Building Model anchored in real world */}
            {modelUrl && (
                <ViroNode 
                    position={[buildingPos.x, buildingPos.y || 0, buildingPos.z]}
                    dragType="FixedToWorld" 
                    onDrag={() => {}} // Allows the user to drag the miniature around the floor
                >
                    <ViroText 
                        text={buildingName || "Target"} 
                        scale={[0.2, 0.2, 0.2]} 
                        position={[0, 0.5, 0]} 
                        style={{ fontFamily: "Arial", fontSize: 24, color: "#FFFFFF" }} 
                        extrusionDepth={2}
                        materials={["textMaterial"]}
                    />
                    <Viro3DObject
                        source={{ uri: modelUrl }}
                        position={[0, -1, 0]} // Sit on the ground
                        scale={[0.00001, 0.00001, 0.00001]} // Extreme scale down for CAD/Sketchup mm exports
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
ViroAnimations.registerAnimations({
    spin: {
        properties: {
            rotateY: "+=360"
        },
        duration: 10000,
    }
});

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
