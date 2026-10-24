import { Trash2 } from "lucide-react";

import { theme } from "../../theme";

const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
};

const dialogStyle = {
    backgroundColor: "#fff",
    padding: "28px 28px 24px",
    borderRadius: theme.radius.md,
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
};

const cancelButtonStyle = {
    padding: "8px 16px",
    borderRadius: theme.radius.sm,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    fontSize: "13px",
};

const confirmButtonStyle = {
    padding: "8px 16px",
    borderRadius: theme.radius.sm,
    border: "none",
    background: theme.colors.error,
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px",
};

const DeleteConfirmModal = ({ open, title, message, onCancel, onConfirm }) => {
    if (!open) return null;

    return (
        <div style={overlayStyle}>
            <div style={dialogStyle}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        marginBottom: "20px",
                    }}
                >
                    <div
                        style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(211,47,47,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <Trash2 size={20} color="#d32f2f" />
                    </div>
                    <div>
                        <h3
                            style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                margin: "0 0 6px 0",
                                color: "#111827",
                            }}
                        >
                            {title}
                        </h3>
                        <p
                            style={{
                                margin: 0,
                                fontSize: "13px",
                                color: "#6b7280",
                                lineHeight: "1.5",
                            }}
                        >
                            {message}
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: theme.spacing.sm,
                    }}
                >
                    <button onClick={onCancel} style={cancelButtonStyle}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={confirmButtonStyle}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
