import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { KnowledgeProvider } from "./store/knowledgeStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <KnowledgeProvider>
      <App />
    </KnowledgeProvider>
  </React.StrictMode>,
);
