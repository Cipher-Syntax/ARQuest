import React from "react";
import { AuthProvider } from "../hooks/useAuth";
import { BrandingProvider } from "../context/BrandingContext";

const Provider = ({ children }) => {
    return (
        <AuthProvider>
            <BrandingProvider>{children}</BrandingProvider>
        </AuthProvider>
    )

};

export default Provider;
