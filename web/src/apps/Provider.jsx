import React from "react";
import { AuthProvider } from "../hooks/useAuth";

const Provider = ({ children }) => {
    return (
        <AuthProvider>{children}</AuthProvider>
    )

};

export default Provider;
