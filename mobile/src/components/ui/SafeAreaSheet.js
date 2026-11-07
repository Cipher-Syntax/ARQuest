import { Animated, TouchableOpacity, View } from "react-native";
import {
    SafeAreaProvider,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

/**
 * Android renders <Modal> in its own native window, so the app-root
 * SafeAreaProvider cannot report the modal's insets. Bottom sheets rendered
 * inside a Modal must be wrapped in their own provider.
 *
 * Only children of this provider can read the insets correctly, which is why
 * the helpers below are separate components rather than inline styles.
 */
export function ModalSafeArea({ children }) {
    return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

/**
 * Bottom inset with a minimum padding floor.
 *
 * Always uses `max(inset, base)` so a surface never ends up with double
 * padding when the system inset is larger than the design value.
 */
export function useBottomInset(base = 0) {
    const { bottom } = useSafeAreaInsets();
    return Math.max(bottom, base);
}

/** Bottom sheet surface that keeps its content above the system nav bar. */
export function BottomSheetSurface({ base = 0, style, children, ...rest }) {
    const paddingBottom = useBottomInset(base);
    return (
        <TouchableOpacity
            activeOpacity={1}
            style={[style, { paddingBottom }]}
            {...rest}
        >
            {children}
        </TouchableOpacity>
    );
}

/** Same as BottomSheetSurface, but for plain (non-pressable) containers. */
export function BottomSheetView({ base = 0, style, children, ...rest }) {
    const paddingBottom = useBottomInset(base);
    return (
        <View style={[style, { paddingBottom }]} {...rest}>
            {children}
        </View>
    );
}

/** Animated visual-novel style bottom bar, safe-area aware. */
export function AnimatedBottomBar({ base = 0, style, children, ...rest }) {
    const paddingBottom = useBottomInset(base);
    return (
        <Animated.View style={[style, { paddingBottom }]} {...rest}>
            {children}
        </Animated.View>
    );
}
