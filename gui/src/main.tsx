import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LogProvider } from "services/s3si";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LogProvider limit={100}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LogProvider>
  </React.StrictMode >
);
