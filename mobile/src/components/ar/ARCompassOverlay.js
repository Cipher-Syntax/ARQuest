import React from "react";
import { View, Text } from "react-native";

/**
 * Persistent compass dial shown while navigating to a target.
 * Purely presentational: the parent decides when it is visible.
 */
export default function ARCompassOverlay({ arrowAngle, distanceToTarget }) {
    return (
        <View
            pointerEvents="none"
            style={{
                position: "absolute",
                top: 175,
                right: 16,
                alignItems: "center",
                zIndex: 40,
            }}
        >
            {/* Outer compass dial */}
            <View
                style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: "rgba(15, 23, 42, 0.80)",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.40)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.35,
                    shadowRadius: 5,
                    elevation: 8,
                }}
            >
                {/* Forward / Device heading tick mark (top of dial) */}
                <View
                    style={{
                        position: "absolute",
                        top: 2.5,
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "#EBBC26",
                    }}
                />

                {/* Rotating Target Needle (rotates around center pivot to target bearing) */}
                <View
                    style={{
                        width: 44,
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        transform: [{ rotate: `${Math.round(arrowAngle)}deg` }],
                    }}
                >
                    {/* Forward Pointer (Crimson Arrow pointing toward target) */}
                    <View
                        style={{
                            width: 0,
                            height: 0,
                            borderLeftWidth: 6,
                            borderRightWidth: 6,
                            borderBottomWidth: 15,
                            borderLeftColor: "transparent",
                            borderRightColor: "transparent",
                            borderBottomColor: "#B21830",
                            marginBottom: 1,
                        }}
                    />
                    {/* Opposite Tail (Muted White/Silver pointing away) */}
                    <View
                        style={{
                            width: 0,
                            height: 0,
                            borderLeftWidth: 4,
                            borderRightWidth: 4,
                            borderTopWidth: 10,
                            borderLeftColor: "transparent",
                            borderRightColor: "transparent",
                            borderTopColor: "rgba(255, 255, 255, 0.45)",
                            marginTop: 1,
                        }}
                    />
                    {/* Center Pivot Pin */}
                    <View
                        style={{
                            position: "absolute",
                            width: 7,
                            height: 7,
                            borderRadius: 3.5,
                            backgroundColor: "#EBBC26",
                            borderWidth: 1.5,
                            borderColor: "#FFFFFF",
                        }}
                    />
                </View>
            </View>

            {/* Distance Badge below compass */}
            {distanceToTarget !== null && (
                <View
                    style={{
                        marginTop: 4,
                        backgroundColor: "rgba(15, 23, 42, 0.85)",
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.25)",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 10,
                            fontWeight: "800",
                            letterSpacing: 0.5,
                            textAlign: "center",
                        }}
                    >
                        {`${Math.round(distanceToTarget)}m`}
                    </Text>
                </View>
            )}
        </View>
    );
}
