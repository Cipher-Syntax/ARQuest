import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "../theme/tokens";

export default function OfflineBanner() {
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
        if (!isConnected) {
            Animated.timing(animation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isConnected, animation]);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 0],
    });

    if (isConnected && animation._value === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY }] },
                { paddingTop: Math.max(insets.top, 20) },
            ]}
        >
            <View style={styles.content}>
                <WifiOff size={16} color="#FFFFFF" />
                <Text style={styles.text}>NO INTERNET CONNECTION</Text>
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
        backgroundColor: theme.colors.error || "#B21830",
        zIndex: 9999,
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
