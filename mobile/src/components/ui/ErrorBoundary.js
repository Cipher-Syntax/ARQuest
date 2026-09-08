import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import theme from "../../theme/tokens";

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={[styles.container, this.props.style]}>
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <AlertTriangle size={28} color="#E74C3C" />
                        </View>
                        <Text style={styles.title}>
                            {this.props.title || "Display Interrupted"}
                        </Text>
                        <Text style={styles.message}>
                            {this.props.message ||
                                "A rendering issue occurred. Tap below to reload this view."}
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={this.handleReset}
                            activeOpacity={0.8}
                        >
                            <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.retryText}>RETRY VIEW</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#072A30",
        padding: 24,
    },
    card: {
        backgroundColor: "#123B44",
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "rgba(0, 229, 255, 0.3)",
        padding: 24,
        alignItems: "center",
        maxWidth: 360,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(231, 76, 60, 0.15)",
        borderWidth: 1.5,
        borderColor: "#E74C3C",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        color: "#C9D6DA",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 20,
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#7F0303",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    retryText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "bold",
        letterSpacing: 1,
    },
});

export default ErrorBoundary;
