import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDemoMode } from "../../context/DemoModeContext";

/**
 * Exhibit banner shown while Demo Mode is enabled by an admin.
 *
 * Styled like the offline banner. The extra offset keeps both readable if the
 * device happens to be offline while demoing.
 */
export default function DemoModeBanner() {
    const { demoMode } = useDemoMode();
    const [isConnected, setIsConnected] = useState(true);
    const [animation] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsConnected(state.isConnected ?? true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(animation, {
            toValue: demoMode ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [demoMode, animation]);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 0],
    });

    if (!demoMode && animation._value === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY }] },
                {
                    paddingTop: Math.max(insets.top, 20) + (isConnected ? 0 : 34),
                },
            ]}
        >
            <View style={styles.content}>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.text}>DEMO MODE</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#B45309",
        zIndex: 9998,
        paddingBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    text: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 1.5,
    },
});
