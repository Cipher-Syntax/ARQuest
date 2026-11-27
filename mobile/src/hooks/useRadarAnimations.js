import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * Radar pulse & spin animations for Explore screen.
 * Paused when not tracking or screen unfocused.
 * Returns { pulseAnim1, pulseAnim2, spinAnim, spinInterpolate }.
 */
export function useRadarAnimations({ isTracking, isFocused }) {
    const pulseAnim1 = useRef(new Animated.Value(1));
    const pulseAnim2 = useRef(new Animated.Value(1));
    const spinAnim = useRef(new Animated.Value(0));

    useEffect(() => {
        if (!isTracking || !isFocused) {
            pulseAnim1.current.setValue(1);
            pulseAnim2.current.setValue(1);
            spinAnim.current.setValue(0);
            return;
        }

        const pulseLoop = Animated.loop(
            Animated.stagger(600, [
                Animated.sequence([
                    Animated.timing(pulseAnim1.current, {
                        toValue: 1.5,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim1.current, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(pulseAnim2.current, {
                        toValue: 1.5,
                        duration: 1800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim2.current, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        const spinLoop = Animated.loop(
            Animated.timing(spinAnim.current, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        pulseLoop.start();
        spinLoop.start();

        return () => {
            pulseLoop.stop();
            spinLoop.stop();
            pulseAnim1.current.setValue(1);
            pulseAnim2.current.setValue(1);
            spinAnim.current.setValue(0);
        };
    }, [isTracking, isFocused]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const spinInterpolate = useMemo(
        () => spinAnim.current.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
        }),
        []
    );

    return {
        pulseAnim1: pulseAnim1.current,
        pulseAnim2: pulseAnim2.current,
        spinAnim: spinAnim.current,
        spinInterpolate,
    };
}

export default useRadarAnimations;