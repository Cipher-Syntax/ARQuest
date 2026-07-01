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
                        <Text style={styles.tagline}>
                            Embark on an immersive AR journey. Discover campus landmarks, complete quests, and unlock exclusive rewards.
                        </Text>
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
        height: '60%', // Cover bottom part more to accommodate text
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 150, // Pushed significantly higher from bottom
    },
    headline: {
        fontFamily: fonts.heading.bold,
        fontSize: 46, // Made slightly bigger
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        letterSpacing: 1,
        marginBottom: -5,
    },
    subHeadline: {
        fontFamily: fonts.heading.bold,
        fontSize: 46, // Made slightly bigger
        color: theme.colors.primary,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        letterSpacing: 1,
        marginBottom: 12,
    },
    tagline: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 5,
    }
});
