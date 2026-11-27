import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Timer } from "lucide-react-native";
import { router } from "expo-router";

import { useHomeStyles } from "./homeStyles";

/** One active time-limited challenge, styled as a tear-off ticket. */
export default function ChallengeTicket({ challenge, expiresAt }) {
    const styles = useHomeStyles();

    return (
        <TouchableOpacity
            style={styles.ticketCard}
            onPress={() => router.push("/(tabs)/ar")}
            activeOpacity={0.9}
        >
            <View style={styles.ticketStub}>
                <Timer
                    color="#FFFFFF"
                    size={20}
                    style={{ marginBottom: 4 }}
                />
                <Text style={styles.ticketStubValue}>
                    +{challenge.reward_points}
                </Text>
                <Text style={styles.ticketStubLabel}>
                    EXP
                </Text>
                <View style={styles.ticketCutoutTop} />
                <View style={styles.ticketCutoutBottom} />
            </View>
            <View style={styles.ticketBody}>
                <Text
                    style={styles.ticketTitle}
                    numberOfLines={2}
                >
                    {challenge.title}
                </Text>
                <View style={styles.ticketFooter}>
                    <View>
                        <Text style={styles.ticketTargetLabel}>
                            EXPIRES AT
                        </Text>
                        <Text style={styles.ticketTargetValue}>
                            {expiresAt.toLocaleTimeString(
                                [],
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                },
                            )}
                        </Text>
                    </View>
                    <View style={styles.ticketDeployBtn}>
                        <Text style={styles.ticketDeployText}>
                            START
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
