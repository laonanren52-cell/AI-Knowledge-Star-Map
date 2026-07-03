import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./store/authStore";
import { AiStatusProvider } from "./store/aiStatusStore";
import { KnowledgeProvider } from "./store/knowledgeStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <KnowledgeProvider>
        <AiStatusProvider>
          <App />
        </AiStatusProvider>
      </KnowledgeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
