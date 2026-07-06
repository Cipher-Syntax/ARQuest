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
