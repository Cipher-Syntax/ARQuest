import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import theme from "../../theme/tokens";
import { fonts } from "../../constants/typography";
import { AlertCircle, Info } from "lucide-react-native";

export const alertRef = React.createRef();

export const customAlert = (title, message, buttons) => {
    if (alertRef.current) {
        alertRef.current.show(title, message, buttons);
    } else {
        import("react-native").then((rn) => {
            rn.Alert.alert(title, message, buttons);
        });
    }
};

const CustomAlert = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [buttons, setButtons] = useState([]);

    useImperativeHandle(ref, () => ({
        show: (t, m, b) => {
            setTitle(t);
            setMessage(m);
            // Default OK button if none provided
            setButtons(b || [{ text: "OK", onPress: () => {} }]);
            setVisible(true);
        },
        hide: () => {
            setVisible(false);
        },
    }));

    if (!visible) return null;

    const isError =
        title.toLowerCase().includes("error") ||
        title.toLowerCase().includes("fail") ||
        title.toLowerCase().includes("denied");

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={() => setVisible(false)}
        >
            <View style={styles.overlay}>
                <View style={styles.alertBox}>
                    <View style={styles.iconContainer}>
                        {isError ? (
                            <AlertCircle color={theme.colors.error} size={36} />
                        ) : (
                            <Info color={theme.colors.primary} size={36} />
                        )}
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.buttonContainer}>
                        {buttons.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    btn.style === "cancel" &&
                                        styles.buttonCancel,
                                    btn.style === "destructive" &&
                                        styles.buttonDestructive,
                                ]}
                                onPress={() => {
                                    setVisible(false);
                                    if (btn.onPress) btn.onPress();
                                }}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        btn.style === "cancel" &&
                                            styles.buttonTextCancel,
                                        btn.style === "destructive" &&
                                            styles.buttonTextDestructive,
                                    ]}
                                >
                                    {btn.text?.toUpperCase() || "OK"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
    },
    alertBox: {
        width: "85%",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontFamily: fonts.heading.bold,
        fontSize: 18,
        color: theme.colors.textPrimary,
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    message: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
        justifyContent: "center",
    },
    button: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: theme.radius.sm,
        alignItems: "center",
    },
    buttonCancel: {
        backgroundColor: theme.colors.surfaceLight,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    buttonDestructive: {
        backgroundColor: theme.colors.error,
    },
    buttonText: {
        fontFamily: fonts.heading.bold,
        color: "#FFFFFF",
        fontSize: 14,
        letterSpacing: 1,
    },
    buttonTextCancel: {
        color: theme.colors.textPrimary,
    },
    buttonTextDestructive: {
        color: "#FFFFFF",
    },
});

export default CustomAlert;
