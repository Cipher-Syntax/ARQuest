import { useAuth } from "./useAuth";
import { roleAccess } from "../services/auth/roleAccess";

export const useRoleAccess = () => {
    const { user } = useAuth();

    // Default to visitor if no user or role is undefined
    const currentRole = user?.role || roleAccess.roles.VISITOR;
    const permissions = roleAccess.getRolePermissions(currentRole);

    return {
        role: currentRole,
        ...permissions,

        // Helper to check if user has access to a specific building's heavy features
        // Students need to unlock it, Admin/Professional have bypass, Visitors have no access
        canAccessBuildingFeatures: (isBuildingUnlocked) => {
            if (permissions.requiresUnlock) {
                return isBuildingUnlocked;
            }
            return (
                permissions.canView3D ||
                permissions.canViewPanorama ||
                permissions.canUseAR
            );
        },
    };
};
