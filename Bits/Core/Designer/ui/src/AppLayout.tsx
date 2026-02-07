import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Desktop } from "./views/Desktop";

const AppLayout: React.FC = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        (window as any).__showDesktop = () => navigate("/");
    }, [navigate]);

    return (
        <div className="virtual-desktop">
            <Routes>
                <Route path="/" element={<Desktop />} />
                <Route path="*" element={<Desktop />} />
            </Routes>
        </div>
    );
};

export default AppLayout;

