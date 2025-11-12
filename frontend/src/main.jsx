import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";

// Get the root element once
const rootElement = document.getElementById("root");
// Create the root once
const root = createRoot(rootElement);

// Render everything in a single call
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Auth context wraps the app */}
      <BrowserRouter> {/* Router wraps the app (and uses AuthProvider) */}
        <App /> {/* Your main app component */}
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
