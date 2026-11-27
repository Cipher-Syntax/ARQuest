import React from "react";
import { Text, View } from "react-native";
import { Timer } from "lucide-react-native";

import { useThemeColors } from "../../context/ThemeContext";
import { useHomeStyles } from "./homeStyles";

/** Idle ticket shown when no time-limited challenge is running. */
export default function ChallengeIdleTicket() {
    const colors = useThemeColors();
    const styles = useHomeStyles();

    return (
        <View
            style={[
                styles.ticketCard,
                { opacity: 0.6 },
            ]}
        >
            <View
                style={[
                    styles.ticketStub,
                    {
                        backgroundColor:
                            colors.textMuted,
                        borderColor:
                            "rgba(255,255,255,0.1)",
                    },
                ]}
            >
                <Timer
                    color="#FFFFFF"
                    size={20}
                    style={{ marginBottom: 4 }}
                />
                <Text style={styles.ticketStubValue}>
                    ---
                </Text>
                <Text style={styles.ticketStubLabel}>
                    EXP
                </Text>
                <View style={styles.ticketCutoutTop} />
                <View style={styles.ticketCutoutBottom} />
            </View>
            <View style={styles.ticketBody}>
                <Text
                    style={[
                        styles.ticketTitle,
                        {
                            color: colors.textMuted,
                        },
                    ]}
                    numberOfLines={2}
                >
                    No active limited events
                </Text>
                <View style={styles.ticketFooter}>
                    <View>
                        <Text style={styles.ticketTargetLabel}>
                            STATUS: IDLE
                        </Text>
                        <Text
                            style={[
                                styles.ticketTargetValue,
                                {
                                    color: colors.textMuted,
                                },
                            ]}
                        >
                            STANDBY
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.ticketDeployBtn,
                            {
                                backgroundColor:
                                    colors.surfaceSoft,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.ticketDeployText,
                                {
                                    color: colors.textMuted,
                                },
                            ]}
                        >
                            WAITING
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
