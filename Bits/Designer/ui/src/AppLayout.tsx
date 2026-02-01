import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { FormRenderer, xmlToFormNode } from "./forms";
import mainViewXml from "./views/MainForm.xml?raw";
import { TestForm } from "./views/TestForm";
import { Playground } from "./views/Playground";

const MainView: React.FC = () => {
    const tree = xmlToFormNode(mainViewXml);
    const navigate = useNavigate();

    // Add global handlers for backward compatibility
    React.useEffect(() => {
        (window as any).__showTestForm = () => navigate("/test");
        (window as any).__showPlayground = () => navigate("/playground");
    }, [navigate]);

    return (
        <div className="designer-shell">
            <FormRenderer node={tree} />
        </div>
    );
};

const AppLayout: React.FC = () => {
    return (
        <div className="virtual-desktop">
            <Routes>
                <Route path="/" element={<MainView />} />
                <Route path="/test" element={<TestForm />} />
                <Route path="/playground" element={<Playground />} />
            </Routes>
        </div>
    );
};

export default AppLayout;
