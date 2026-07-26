import { Save, User, Lock, Eye, EyeOff } from "lucide-react";
import { Card, Toggle, Button } from "../components/ui";
import { useState, useEffect } from "react";
import { settingsService } from "../services/settingsService";
import { useAuth } from "../hooks/useAuth";
import {
    validateForm,
    validateString,
    validateNumber,
    validateEmail,
} from "../utils/validation";

export default function Settings() {
    const { user, updateUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [errors, setErrors] = useState({});
    const [settings, setSettings] = useState({
        app_name: "ARQuest",
        maintenance_mode: false,
        contact_email: "support@arquest.edu",
        enable_gps: true,
        enable_qr: true,
        enable_ar_selfie: true,
        enable_accreditation: false,
        enable_trivia: true,
        enable_leaderboard: true,
        default_quest_reward: 50,
    });
    
    // Profile State
    const [profileData, setProfileData] = useState({
        name: "",
        password: "",
        confirmPassword: ""
    });

    useEffect(() => {
        if (user) {
            const fullName = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "";
            setProfileData(prev => ({ ...prev, name: fullName }));
        }
    }, [user]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsService.getSettings();
                setSettings(data);
            } catch (error) {
                console.error("Failed to load settings", error);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: null }));
        }
    };

    const handleSave = async () => {
        const schema = {
            app_name: (val) => validateString(val, 1),
            contact_email: (val) => validateEmail(val),
            default_quest_reward: (val) => validateNumber(val, 0),
        };
        const validationErrors = validateForm(settings, schema);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        try {
            setErrorMessage("");
            setSuccessMessage("");
            setIsSaving(true);
            await settingsService.updateSettings(settings);
            setSuccessMessage("System settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Failed to save settings", error);
            setErrorMessage("Failed to save system settings. Please try again.");
            setTimeout(() => setErrorMessage(""), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleProfileSave = async () => {
        try {
            setIsProfileSaving(true);
            setErrorMessage("");
            setSuccessMessage("");
            const parts = profileData.name.trim().split(" ");
            const payload = {
                first_name: parts[0] || "",
                last_name: parts.slice(1).join(" ") || ""
            };
            if (profileData.password) {
                if (profileData.password !== profileData.confirmPassword) {
                    setErrorMessage("Passwords do not match!");
                    setIsProfileSaving(false);
                    return;
                }
                payload.password = profileData.password;
            }
            
            await updateUser(payload);
            
            setProfileData(prev => ({ ...prev, password: "", confirmPassword: "" })); // Clear password fields
            setSuccessMessage("Personal profile updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Failed to update profile", error);
            setErrorMessage("Failed to update profile. Please try again.");
            setTimeout(() => setErrorMessage(""), 3000);
        } finally {
            setIsProfileSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        System Settings
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Configure and update system features and behaviors.
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    className="gap-2 px-8"
                    disabled={isSaving}
                >
                    <Save size={18} />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {successMessage && (
                <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 font-medium">
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 font-medium">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                            <User size={18} className="text-brand" />
                            Admin Profile
                        </h3>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Email Address (Read-only)
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || "admin@wmsu.edu.ph"}
                                    disabled
                                    className="w-full border border-gray-200 rounded-md bg-gray-50 text-sm py-3 px-4 text-gray-500 font-medium cursor-not-allowed"
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock size={14} /> New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Leave blank to keep current"
                                        value={profileData.password}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full border border-brand-border rounded-md bg-white text-sm py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-brand/20 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock size={14} /> Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Type new password again"
                                        value={profileData.confirmPassword}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className={`w-full border rounded-md bg-white text-sm py-3 px-4 pr-10 focus:outline-none focus:ring-2 font-medium ${profileData.confirmPassword && profileData.password !== profileData.confirmPassword ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {profileData.confirmPassword && profileData.password !== profileData.confirmPassword && (
                                    <p className="text-xs text-red-500">Passwords do not match</p>
                                )}
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={handleProfileSave}
                                    disabled={isProfileSaving}
                                    className="text-sm px-4 py-2 h-auto"
                                >
                                    {isProfileSaving ? "Updating..." : "Update Profile"}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-bold text-gray-900 mb-5">
                            General Settings
                        </h3>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    App Name
                                </label>
                                <input
                                    type="text"
                                    value={settings.app_name}
                                    onChange={(e) =>
                                        handleChange("app_name", e.target.value)
                                    }
                                    className={`w-full border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 font-medium ${errors.app_name ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                                />
                                {errors.app_name && (
                                    <p className="text-xs text-red-500">
                                        {errors.app_name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Contact Email
                                </label>
                                <input
                                    type="email"
                                    value={settings.contact_email}
                                    onChange={(e) =>
                                        handleChange(
                                            "contact_email",
                                            e.target.value,
                                        )
                                    }
                                    className={`w-full border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 font-medium ${errors.contact_email ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                                />
                                {errors.contact_email && (
                                    <p className="text-xs text-red-500">
                                        {errors.contact_email}
                                    </p>
                                )}
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 text-red-600">
                                        Maintenance Mode
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Disable access to the mobile app for
                                        maintenance.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.maintenance_mode}
                                    onChange={() =>
                                        handleChange(
                                            "maintenance_mode",
                                            !settings.maintenance_mode,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <h3 className="text-sm font-bold text-gray-900 mb-5">
                            App Features
                        </h3>
                        <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        GPS Geofencing
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Enable location-based building
                                        detection.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_gps}
                                    onChange={() =>
                                        handleChange(
                                            "enable_gps",
                                            !settings.enable_gps,
                                        )
                                    }
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        QR Verification
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Allow QR code scanning for building
                                        check-in.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_qr}
                                    onChange={() =>
                                        handleChange(
                                            "enable_qr",
                                            !settings.enable_qr,
                                        )
                                    }
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        AR Selfie Mode
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Let students take AR-enhanced selfies on
                                        campus.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_ar_selfie}
                                    onChange={() =>
                                        handleChange(
                                            "enable_ar_selfie",
                                            !settings.enable_ar_selfie,
                                        )
                                    }
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Accreditation Access
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Show accreditation data within building
                                        pages.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_accreditation}
                                    onChange={() =>
                                        handleChange(
                                            "enable_accreditation",
                                            !settings.enable_accreditation,
                                        )
                                    }
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Trivia System
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Display trivia facts to students on
                                        building entry.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_trivia}
                                    onChange={() =>
                                        handleChange(
                                            "enable_trivia",
                                            !settings.enable_trivia,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-bold text-gray-900 mb-5">
                            Gamification
                        </h3>
                        <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        Leaderboard System
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Enable student rankings and XP scoring.
                                    </p>
                                </div>
                                <Toggle
                                    checked={settings.enable_leaderboard}
                                    onChange={() =>
                                        handleChange(
                                            "enable_leaderboard",
                                            !settings.enable_leaderboard,
                                        )
                                    }
                                />
                            </div>
                            <div className="h-px bg-brand-border" />
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Default Quest Reward (XP)
                                </label>
                                <input
                                    type="number"
                                    value={settings.default_quest_reward}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        handleChange(
                                            "default_quest_reward",
                                            val === "" ? "" : parseInt(val),
                                        );
                                    }}
                                    className={`w-full border rounded-md bg-white text-sm py-3 px-4 focus:outline-none focus:ring-2 font-medium max-w-[150px] ${errors.default_quest_reward ? "border-red-500 focus:ring-red-200" : "border-brand-border focus:ring-brand/20"}`}
                                />
                                {errors.default_quest_reward && (
                                    <p className="text-xs text-red-500">
                                        {errors.default_quest_reward}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
