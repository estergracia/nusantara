import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function RequireAuth({ fallbackTo = "/login" }) {
  const location = useLocation();
  const { currentUser, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div
          className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm text-center"
          style={{
            // ✅ paksa teks tetap kontras di mode complex
            color: "#111827", // gray-900
          }}
        >
          <div
            className="text-lg font-extrabold"
            style={{
              // ✅ lebih gelap lagi biar kebaca
              color: "#0b1220",
            }}
          >
            Memeriksa login…
          </div>

          <div className="mt-4 flex justify-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4"
              style={{
                borderColor: "rgba(17,24,39,0.18)", // ring
                borderTopColor: "#111827", // head
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate to={{ pathname: fallbackTo, search: location.search }} replace />
    );
  }

  return <Outlet />;
}
