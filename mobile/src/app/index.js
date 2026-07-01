import React, { useState, useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { View, Text, ImageBackground, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../theme/tokens";
import { fonts } from "../constants/typography";

export default function Index() {
    const { user, isLoading } = useAuth();
    const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Enforce a minimum 2.5 second splash screen
        const timer = setTimeout(() => {
            setMinSplashTimeDone(true);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const isReady = !isLoading && minSplashTimeDone;

    if (!isReady) {
        return (
            <View style={styles.container}>
                <ImageBackground 
                    source={require('../../assets/images/wmsu_landing_page_background.jpg')} 
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(138, 21, 56, 0.8)', 'rgba(0,0,0,0.9)']}
                        style={styles.gradientOverlay}
                    >
                        <Text style={styles.headline}>Explore WMSU,</Text>
                        <Text style={styles.subHeadline}>Your Way</Text>
                    </LinearGradient>
                </ImageBackground>
            </View>
        );
    }

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black behind image just in case
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    gradientOverlay: {
        height: '45%', // Cover bottom part
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 60,
    },
    headline: {
        fontFamily: fonts.heading.bold,
        fontSize: 38,
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        letterSpacing: 1,
        marginBottom: -5,
    },
    subHeadline: {
        fontFamily: fonts.heading.bold,
        fontSize: 38,
        color: theme.colors.primary,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        letterSpacing: 1,
    }
});
