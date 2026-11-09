import { Outlet } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useAuth } from "../hooks/useAuth";
import { settingsService } from "../services/settingsService";
import { AlertTriangle, Presentation } from "lucide-react";
import AdminOnboardingTour from "../components/common/AdminOnboardingTour";

export default function AppLayout() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        maintenance_mode: false,
        demo_mode: false,
    });

    const loadSettings = useCallback(async () => {
        try {
            const data = await settingsService.getSettings();
            setSettings(data);
            if (data?.app_name) {
                document.title = `${data.app_name} Admin`;
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        // Refresh when the admin returns to the tab so toggles flipped on
        // another device show up without a full reload.
        const onFocus = () => loadSettings();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [loadSettings]);

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {settings.maintenance_mode && settings.demo_mode ? (
                    <div className="bg-slate-800 text-white px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2 z-50 shadow-sm border-b border-slate-900">
                        <AlertTriangle size={18} />
                        <Presentation size={18} />
                        MAINTENANCE MODE AND DEMO MODE ARE BOTH ACTIVE: the
                        mobile app is locked except for admins, while exhibit
                        QR unlocks stay isolated from real progress.
                    </div>
                ) : settings.maintenance_mode ? (
                    <div className="bg-red-600 text-white px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2 z-50 shadow-sm border-b border-red-700">
                        <AlertTriangle size={18} />
                        MAINTENANCE MODE IS ACTIVE: Students currently cannot
                        access the mobile app.
                    </div>
                ) : settings.demo_mode ? (
                    <div className="bg-amber-500 text-white px-4 py-2.5 text-center text-sm font-bold flex items-center justify-center gap-2 z-50 shadow-sm border-b border-amber-600">
                        <Presentation size={18} />
                        DEMO MODE IS ACTIVE: QR codes unlock buildings without
                        the location check. Demo unlocks revert when this is
                        turned off.
                    </div>
                ) : null}
                <TopBar user={user} />
                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
            <AdminOnboardingTour />
        </div>
    );
}
