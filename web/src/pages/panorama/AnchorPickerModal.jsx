import { theme } from "../../theme";

const AnchorPickerModal = ({ open, sceneTitle, iframeRef, onLoad, onClose }) => {
    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "#f8fafc",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    padding: "14px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: theme.colors.primary,
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
            >
                <div>
                    <h2
                        style={{
                            color: "#ffffff",
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "700",
                            letterSpacing: "0.5px",
                        }}
                    >
                        PICK 3D ANCHOR: {sceneTitle}
                    </h2>

                    <p
                        style={{
                            color: "rgba(255,255,255,0.85)",
                            margin: "4px 0 0 0",
                            fontSize: "12px",
                        }}
                    >
                        Rotate / zoom around the 3D building. <b>Double-click</b> on
                        the doorway, entrance, or floor where this panorama photo was
                        taken.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        background: theme.colors.error,
                        color: "white",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "12px",
                    }}
                >
                    Cancel
                </button>
            </div>
            <iframe
                ref={iframeRef}
                src="/admin-hotspot-editor.html"
                style={{ width: "100%", flex: 1, border: "none" }}
                onLoad={onLoad}
            />
        </div>
    );
};

export default AnchorPickerModal;
