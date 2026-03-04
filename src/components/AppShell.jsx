import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar.jsx";

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="w-full flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs ui-muted">
        Belajar Nusantara
      </footer>
    </div>
  );
}
