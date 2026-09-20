import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes";
import Provider from "./Provider";

const App = () => {
    return (
        <BrowserRouter>
            <Provider>
                <AppRoutes />
            </Provider>
        </BrowserRouter>
    );
};

export default App;
