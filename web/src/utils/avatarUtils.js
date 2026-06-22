const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AVATARS = [
  { id: 'explorer_1', uri: PLACEHOLDER_IMAGE },
  { id: 'explorer_2', uri: PLACEHOLDER_IMAGE },
  { id: 'mascot_1', uri: PLACEHOLDER_IMAGE },
  { id: 'student_1', uri: PLACEHOLDER_IMAGE },
  { id: 'student_2', uri: PLACEHOLDER_IMAGE },
  { id: 'visitor_1', uri: PLACEHOLDER_IMAGE },
];

export const getAvatarUri = (avatarId) => {
    const avatar = AVATARS.find(a => a.id === avatarId);
    return avatar ? avatar.uri : null;
};
