import React, { useId, useState } from "react";
import { Upload, X } from "lucide-react";
import { theme } from "../../theme";

const DragDropFileUpload = ({
    accept,
    onChange,
    value,
    placeholder = "Drag & drop file here or click to browse",
    previewNode,
    multiple = false,
    disabled = false,
    compact = false,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputId = `file-input-${useId().replace(/:/g, "")}`;

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const emit = (fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;
        onChange(multiple ? files : files[0]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        emit(e.dataTransfer.files);
    };

    const handleFileChange = (e) => {
        emit(e.target.files);
        // Allow re-selecting the same file(s)
        e.target.value = "";
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        onChange(null);
    };

    const singleValue = !multiple ? value : null;

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
                if (!disabled) document.getElementById(inputId)?.click();
            }}
            style={{
                border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.border}`,
                borderRadius: theme.radius.md,
                padding: compact ? theme.spacing.md : theme.spacing.lg,
                textAlign: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                backgroundColor: isDragging
                    ? "rgba(138, 21, 56, 0.05)"
                    : "#fafafa",
                transition: "all 0.2s",
                position: "relative",
            }}
        >
            <input
                id={inputId}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                onChange={handleFileChange}
                style={{ display: "none" }}
            />

            {previewNode && (
                <div
                    style={{
                        pointerEvents: "none",
                        marginBottom: value ? theme.spacing.md : 0,
                    }}
                >
                    {previewNode}
                </div>
            )}

            {singleValue ? (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: theme.spacing.sm,
                    }}
                >
                    <span
                        style={{
                            fontSize: "14px",
                            color: theme.colors.text.primary,
                            fontWeight: "500",
                        }}
                    >
                        {singleValue.name}
                    </span>
                    <button
                        onClick={handleRemove}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: theme.colors.error,
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <>
                    <Upload
                        size={compact ? 24 : 32}
                        color={theme.colors.text.secondary}
                        style={{ margin: "0 auto 8px" }}
                    />
                    <div
                        style={{
                            fontSize: compact ? "13px" : "14px",
                            color: theme.colors.text.secondary,
                        }}
                    >
                        {placeholder}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: theme.colors.text.muted,
                            marginTop: "4px",
                        }}
                    >
                        {accept.split(",").join(", ")}
                    </div>
                </>
            )}
        </div>
    );
};

export default DragDropFileUpload;
