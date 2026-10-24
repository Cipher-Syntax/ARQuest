import { theme } from "../../theme";

const PreviewModal = ({
    open,
    scene,
    hotspots,
    building,
    scenes,
    iframeRef,
    onClose,
}) => {
    if (!open || !scene) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "#000",
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
                    background: "rgba(0,0,0,0.8)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                <h2
                    style={{
                        color: "#ffffff",
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                    }}
                >
                    360 PREVIEW: {scene.title}
                </h2>
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
                    Close Preview
                </button>
            </div>
            <div style={{ flex: 1, position: "relative", background: "#000" }}>
                <iframe
                    ref={iframeRef}
                    src="/panorama-viewer.html"
                    style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        display: "block",
                    }}
                    onLoad={(e) => {
                        e.target.contentWindow.postMessage(
                            {
                                type: "init",
                                imageUrl: scene.image_url,
                                hotspots: hotspots || [],
                                title: scene.title,
                                buildingName: building?.name || "Campus Walkthrough",
                                allScenes: scenes.map((s) => ({
                                    id: s.id,
                                    title: s.title,
                                    image_url: s.image_url,
                                    is_start_scene: Boolean(s.is_start_scene),
                                })),
                            },
                            "*"
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default PreviewModal;
