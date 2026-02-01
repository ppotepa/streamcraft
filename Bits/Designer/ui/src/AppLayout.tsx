import React from "react";
import { FormRenderer, xmlToFormNode } from "./forms";
import mainViewXml from "./views/MainForm.xml?raw";

const AppLayout: React.FC = () => {
    const tree = xmlToFormNode(mainViewXml);
    return (
        <div className="designer-shell">
            <FormRenderer node={tree} />
        </div>
    );
};

export default AppLayout;
