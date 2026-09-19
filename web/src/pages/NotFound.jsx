import React from "react";
import { Compass } from "lucide-react";

const NotFound = () => {
    return (
        <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="flex flex-col items-center justify-center gap-6">
                <Compass size={128} className="text-brand stroke-[1.5]" />
                <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight font-heading">
                    Page Not Found
                </h1>
            </div>
        </div>
    );
};

export default NotFound;