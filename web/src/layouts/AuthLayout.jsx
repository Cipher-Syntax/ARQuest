import { Outlet } from "react-router-dom";
import { Target } from "lucide-react";

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF0F3] via-white to-[#FFD6DE] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 bg-[#DC143C] rounded-lg flex items-center justify-center shadow-lg mb-3">
                        <Target size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827]">
                        ARQuest
                    </h1>
                    <p className="text-sm text-[#6B7280]">WMSU Campus Admin</p>
                </div>

                {}
                <div className="bg-white rounded-lg border border-[#FFD6DE] shadow-sm p-8">
                    {children || <Outlet />}
                </div>

                <p className="text-center text-xs text-[#9CA3AF] mt-6">
                    © {new Date().getFullYear()} Western Mindanao State
                    University · ARQuest
                </p>
            </div>
        </div>
    );
}
