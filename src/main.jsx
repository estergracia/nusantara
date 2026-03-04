import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./App.css"
import "./index.css";
import { ToastProvider } from "./hooks/useToast.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { enableOfflinePersistence } from "./firebase/firebase.js";

enableOfflinePersistence();

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  // </React.StrictMode>
);
