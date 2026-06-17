export const roleAccess = {
    roles: {
        ADMIN: 'admin',
        STUDENT: 'student',
        PROFESSIONAL: 'professional',
        VISITOR: 'visitor'
    },
    
    permissions: {
        admin: {
            canAccessAdmin: true,
            canView3D: true,
            canViewPanorama: true,
            canUseAR: true,
            requiresUnlock: false,
            canMutateData: true
        },
        student: {
            canAccessAdmin: false,
            canView3D: true,
            canViewPanorama: true,
            canUseAR: true,
            requiresUnlock: true,
            canMutateData: false
        },
        professional: {
            canAccessAdmin: false,
            canView3D: true,
            canViewPanorama: true,
            canUseAR: true,
            requiresUnlock: false,
            canMutateData: false
        },
        visitor: {
            canAccessAdmin: false,
            canView3D: false,
            canViewPanorama: false,
            canUseAR: false,
            requiresUnlock: true,
            canMutateData: false
        }
    },

    getRolePermissions: (role) => {
        return roleAccess.permissions[role] || roleAccess.permissions.visitor;
    }
};
