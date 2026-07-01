import { Stack } from "expo-router";
import { ImageBackground, StyleSheet, View } from "react-native";
import theme from "../../theme/tokens";

export default function AuthLayout() {
    return (
        <View style={styles.container}>
            <ImageBackground 
                source={require('../../../assets/images/wmsu_landing_page_background.jpg')} 
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={10} // Heavy blur for form focus
            >
                <View style={styles.overlay} />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' }
                    }}
                >
                    <Stack.Screen name="login" options={{ title: "Login" }} />
                </Stack>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Dark tint so inputs pop
    }
});
