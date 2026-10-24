import { ArrowLeft, Eye } from "lucide-react";

import { theme } from "../../theme";

const PanoramaHeader = ({
    buildingName,
    sceneCount,
    canPreview,
    onBack,
    onPreview,
}) => {
    return (
        <div
            style={{
                backgroundColor: "rgba(138,21,56,0.04)",
                borderBottom: "1px solid rgba(138,21,56,0.12)",
                borderRadius: theme.radius.md,
                padding: "14px 20px",
                marginBottom: theme.spacing.lg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            {/* Left group: back button + building info */}
            <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
                <button
                    onClick={() => onBack()}
                    className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-md flex items-center gap-2 text-xs font-bold transition-colors shadow-xs"
                    title="Return to Building Editor"
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </button>
                <div>
                    <div style={{ fontSize: "17px", fontWeight: "700", color: "#111827" }}>
                        {buildingName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        Panorama Studio • {sceneCount} scene{sceneCount !== 1 ? "s" : ""} uploaded
                    </div>
                </div>
            </div>

            {/* Right group: Preview button */}
            <button
                onClick={() => onPreview()}
                disabled={!canPreview}
                className="px-4 py-2.5 rounded-md flex items-center gap-2 text-xs font-bold transition-colors shadow-xs"
                style={{
                    background: canPreview ? theme.colors.primary : "#e5e7eb",
                    color: canPreview ? "#fff" : "#9ca3af",
                    cursor: canPreview ? "pointer" : "not-allowed",
                    border: "none",
                }}
            >
                <Eye size={16} />
                <span>Preview Scene</span>
            </button>
        </div>
    );
};

export default PanoramaHeader;
