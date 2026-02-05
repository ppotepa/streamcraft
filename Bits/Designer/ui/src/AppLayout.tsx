import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { FormRenderer, xmlToFormNode } from "@streamcraft/forms";
import mainViewXml from "./views/MainForm.xml?raw";
import { TestForm } from "./views/TestForm";
import { Playground } from "./views/playground/Playground";
import { Playground2 } from "./views/Playground2";
import { AllControls } from "./views/AllControls";
import { LivePreview } from "./views/LivePreview";
import { PexelsMediaTest } from "./views/PexelsMediaTest";

const MainView: React.FC = () => {
    const tree = xmlToFormNode(mainViewXml);
    const navigate = useNavigate();

    // Add global handlers for backward compatibility
    React.useEffect(() => {
        (window as any).__showTestForm = () => navigate("/test");
        (window as any).__showPlayground = () => navigate("/playground");
        (window as any).__showPlayground2 = () => navigate("/playground2");
        (window as any).__showAllControls = () => navigate("/all");
        (window as any).__showMediaTest = () => navigate("/media-test");
        (window as any).__showLivePreview = () => {
            const projectId = Math.random().toString(36).slice(2, 11);
            navigate(`/preview/${encodeURIComponent(projectId)}`);
        };
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
                <Route path="/" element={<Playground2 />} />
                <Route path="/test" element={<TestForm />} />
                <Route path="/playground" element={<Playground />} />
                <Route path="/preview" element={<LivePreview />} />
                <Route path="/preview/:projectId" element={<LivePreview />} />
                <Route path="/media-test" element={<PexelsMediaTest />} />
                <Route path="/all" element={<AllControls />} />
                <Route path="/main" element={<MainView />} />
            </Routes>
        </div>
    );
};

export default AppLayout;

