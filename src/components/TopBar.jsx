import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Listbox } from "@headlessui/react";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { useProgress } from "../hooks/useProgress.js";

function getEarnedIds(badges) {
  if (Array.isArray(badges)) return badges;
  if (Array.isArray(badges?.earnedIds)) return badges.earnedIds;
  if (Array.isArray(badges?.unlockedIds)) return badges.unlockedIds;
  if (Array.isArray(badges?.ids)) return badges.ids;
  if (Array.isArray(badges?.nextEarnedIds)) return badges.nextEarnedIds;
  return [];
}

function formatBadgeCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  if (v > 99) return "99+";
  return String(v);
}

const MODE_OPTIONS = [
  { value: "simple", label: "Simple" },
  { value: "medium", label: "Medium" },
  { value: "complex", label: "Complex" },
];

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { level, setLevel } = useUiLevelFirestore();
  const { logout } = useAuth();

  const { badges } = useProgress();

  const badgeCount = useMemo(() => {
    const ids = getEarnedIds(badges);
    return Array.isArray(ids) ? ids.length : 0;
  }, [badges]);

  const badgeLabel = useMemo(() => formatBadgeCount(badgeCount), [badgeCount]);

  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmLeaveQuiz, setConfirmLeaveQuiz] = useState(false);

  const isAuthPage = useMemo(
    () => ["/", "/login", "/register"].includes(location.pathname),
    [location.pathname]
  );

  const canShowBack = useMemo(
    () => !["/", "/login", "/register", "/home"].includes(location.pathname),
    [location.pathname]
  );

  const onBack = () => {
    if (location.pathname === "/quiz") {
      setConfirmLeaveQuiz(true);
      return;
    }
    navigate(-1);
  };

  const selectedMode = useMemo(
    () => MODE_OPTIONS.find((o) => o.value === level) ?? MODE_OPTIONS[0],
    [level]
  );

  return (
    <>
      <header className="ui-topbar">
        <div className="ui-topbar__inner">
          <div className="ui-topbar__left">
            {canShowBack ? (
              <button type="button" className="ui-pill" onClick={onBack}>
                ← Back
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="ui-topbar__right">
            {/* Badges button: icon only */}
            {!isAuthPage ? (
              <button
                type="button"
                className="ui-pill ui-pill--icon"
                onClick={() =>
                  navigate({ pathname: "/achievements", search: location.search })
                }
                title="Badges"
                aria-label="Badges"
              >
                🏅
                {badgeLabel ? (
                  <span
                    className="ui-badge-dot"
                    aria-label={`${badgeCount} badges`}
                  >
                    {badgeLabel}
                  </span>
                ) : null}
              </button>
            ) : null}

            {/* Mode selector (custom, rounded panel) */}
            <div className="ui-mode">
              <Listbox
                value={selectedMode}
                onChange={(opt) => setLevel(opt.value)}
              >
                <div className="ui-selectWrap">
                  <Listbox.Button
                    type="button"
                    className="ui-select ui-select--soft"
                    aria-label="Mode"
                  >
                    <span className="ui-selectText">{selectedMode.label}</span>

                    <span className="ui-selectIcon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M7 10l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Listbox.Button>

                  <Listbox.Options className="ui-selectPanel">
                    {MODE_OPTIONS.map((opt) => (
                      <Listbox.Option key={opt.value} value={opt}>
                        {({ active, selected }) => (
                          <div
                            className={[
                              "ui-selectItem",
                              active ? "is-active" : "",
                              selected ? "is-selected" : "",
                            ].join(" ")}
                          >
                            {opt.label}
                          </div>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Logout */}
            {!isAuthPage ? (
              <button
                type="button"
                className="ui-pill ui-pill--primary"
                onClick={() => setConfirmLogout(true)}
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Confirm leave quiz */}
      <ConfirmDialog
        open={confirmLeaveQuiz}
        title="Keluar dari kuis?"
        message="Progress soal saat ini akan hilang. Yakin ingin kembali?"
        confirmText="Keluar"
        cancelText="Batal"
        onCancel={() => setConfirmLeaveQuiz(false)}
        onConfirm={() => {
          setConfirmLeaveQuiz(false);
          navigate({ pathname: "/home", search: location.search });
        }}
      />

      {/* Confirm logout */}
      {!isAuthPage ? (
        <ConfirmDialog
          open={confirmLogout}
          title="Logout akun?"
          message="Yakin ingin logout dari aplikasi?"
          confirmText="Logout"
          cancelText="Batal"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={async () => {
            setConfirmLogout(false);
            await logout();
            navigate({ pathname: "/login", search: location.search });
          }}
        />
      ) : null}
    </>
  );
}
