import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import api from "../services/api";
import {
    DEFAULT_BRAND_COLOR,
    applyBrandPalette,
    normalizeHexColor,
} from "../utils/brandColor";

const FALLBACK_LOGO = "/logo.png";
const FALLBACK_NAME = "ARQuest";

export const DEFAULT_BRANDING = {
    appName: FALLBACK_NAME,
    brandColor: DEFAULT_BRAND_COLOR,
    logoUrl: FALLBACK_LOGO,
};

const BrandingContext = createContext({
    ...DEFAULT_BRANDING,
    refreshBranding: async () => DEFAULT_BRANDING,
});

export function BrandingProvider({ children }) {
    const [branding, setBranding] = useState(DEFAULT_BRANDING);

    const syncDocument = useCallback((next) => {
        applyBrandPalette(next.brandColor);
        document.title = next.appName;
    }, []);

    const refreshBranding = useCallback(async () => {
        try {
            const response = await api.get("/api/settings/public/");
            const data = response.data?.data || {};
            const next = {
                appName: (data.app_name || "").trim() || FALLBACK_NAME,
                brandColor: normalizeHexColor(
                    data.brand_color,
                    DEFAULT_BRAND_COLOR,
                ),
                logoUrl: data.logo_url || FALLBACK_LOGO,
            };
            setBranding(next);
            syncDocument(next);
            return next;
        } catch (error) {
            console.error("Failed to load branding settings", error);
            applyBrandPalette(DEFAULT_BRAND_COLOR);
            return DEFAULT_BRANDING;
        }
    }, [syncDocument]);

    useEffect(() => {
        refreshBranding();
    }, [refreshBranding]);

    const value = useMemo(
        () => ({ ...branding, refreshBranding }),
        [branding, refreshBranding],
    );

    return (
        <BrandingContext.Provider value={value}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    return useContext(BrandingContext);
}
