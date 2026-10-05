export const AVATARS = [
    { id: "explorer_1", uri: "/avatars/explorer_1.png" },
    { id: "explorer_2", uri: "/avatars/explorer_2.png" },
    { id: "mascot_1", uri: "/avatars/mascot_1.png" },
    { id: "student_1", uri: "/avatars/student_1.png" },
    { id: "student_2", uri: "/avatars/student_2.png" },
    { id: "visitor_1", uri: "/avatars/visitor_1.png" },
];

export const getAvatarUri = (avatarId) => {
    const avatar = AVATARS.find((a) => a.id === avatarId);
    return avatar ? avatar.uri : null;
};

export const getProfileImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (
        imageUrl.startsWith("http://") ||
        imageUrl.startsWith("https://") ||
        imageUrl.startsWith("blob:") ||
        imageUrl.startsWith("data:")
    ) {
        return imageUrl;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    return `${apiBase.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;
};

