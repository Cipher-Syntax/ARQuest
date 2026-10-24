import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { theme } from "../../theme/tokens";
import { fonts } from "../../constants/typography";

/**
 * Shown when the device has no ARCore/ARKit support, offering
 * non-AR fallbacks instead of a broken camera session.
 */
export default function ARUnsupportedModal({ visible, onGoToMap, onUseQr }) {
    if (!visible) return null;

    return (
        <View
            style={[
                StyleSheet.absoluteFill,
                {
                    backgroundColor: "rgba(0,0,0,0.75)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    padding: 24,
                },
            ]}
        >
            <View
                style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 6,
                    width: "100%",
                    maxWidth: 360,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 10,
                }}
            >
                {/* Header Ribbon */}
                <View
                    style={{
                        backgroundColor: theme.colors.primary,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <AlertTriangle size={20} color="#FFD700" />
                    <Text
                        style={{
                            fontFamily: fonts.heading.bold,
                            color: "#FFFFFF",
                            fontSize: 13,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                        }}
                    >
                        Spatial AR Not Supported
                    </Text>
                </View>

                {/* Content */}
                <View style={{ padding: 20 }}>
                    <Text
                        style={{
                            fontFamily: fonts.body.bold,
                            color: theme.colors.textPrimary,
                            fontSize: 14,
                            marginBottom: 8,
                        }}
                    >
                        Google ARCore Not Detected
                    </Text>
                    <Text
                        style={{
                            fontFamily: fonts.body.regular,
                            color: theme.colors.textSecondary,
                            fontSize: 13,
                            lineHeight: 20,
                            marginBottom: 20,
                        }}
                    >
                        Your device does not support native Spatial AR tracking. You
                        can still navigate using the Campus 2D Map and scan building QR
                        codes to complete quests.
                    </Text>

                    {/* Action Buttons */}
                    <View style={{ gap: 10 }}>
                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.primary,
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            onPress={onGoToMap}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={{
                                    fontFamily: fonts.heading.bold,
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    letterSpacing: 1,
                                }}
                            >
                                GO TO CAMPUS MAP
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                backgroundColor: "transparent",
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                            }}
                            onPress={onUseQr}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={{
                                    fontFamily: fonts.heading.bold,
                                    color: theme.colors.textPrimary,
                                    fontSize: 11,
                                    letterSpacing: 0.5,
                                }}
                            >
                                USE QR SCANNER INSTEAD
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}
