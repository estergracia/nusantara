import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useToast } from "../hooks/useToast.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  normalizeUsername,
  usernameToEmail,
  sanitizePin,
  isValidUsername,
  isValidPin,
  derivePassword
} from "../utils/authIdentity.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { is } = useUiLevelFirestore();
  const { pushToast } = useToast();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const u = useMemo(() => normalizeUsername(username), [username]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!isValidUsername(u)) return setErr("Username minimal 3 karakter (huruf/angka).");
    if (!isValidPin(pin)) return setErr("PIN harus 4 digit.");

    const email = usernameToEmail(u);
    const password = derivePassword(u, pin);

    try {
      setLoading(true);
      await login(email, password);
      pushToast({ title: "Login berhasil", message: `Halo, ${u}!`, icon: "✅", ttl: 1800 });
      navigate({ pathname: "/home", search: location.search }, { replace: true });
    } catch (e2) {
      const code = e2?.code || "";
      const msg =
        code === "auth/invalid-credential" || code === "auth/user-not-found"
          ? "Akun tidak ditemukan / PIN salah."
          : e2?.message || "Login gagal.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <section className="ui-card ui-card--pattern p-6">
          <div className="ui-title text-2xl font-extrabold">Masuk</div>

          <form onSubmit={onSubmit} className="mt-4 space-y-3" autoComplete="off">
            {/* anti-autofill dummy */}
            <input
              type="text"
              name="fake_user"
              autoComplete="username"
              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
              tabIndex={-1}
            />
            <input
              type="password"
              name="fake_pass"
              autoComplete="new-password"
              style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
              tabIndex={-1}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-extrabold block">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ui-input"
                placeholder="contoh: nina"
                autoComplete="off"
                name="bn_username"
                disabled={loading}
              />
              {!is.simple ? <div className="text-xs ui-muted">Huruf/angka, minimal 3 karakter.</div> : null}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-extrabold block">PIN (4 digit)</label>

              <div className="ui-pinWrap">
                <input
                  className="ui-input ui-input--pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(sanitizePin(e.target.value))}
                  placeholder="1234"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  autoComplete="new-password"
                  name="bn_pin"
                />

                <button
                  type="button"
                  className="ui-eyeBtn"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                  title={showPin ? "Sembunyikan" : "Lihat"}
                >
                  {showPin ? (
                    /* eye-off */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a18.45 18.45 0 0 1-4.36 5.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6.11 6.11A18.43 18.43 0 0 0 2 12s3 7 10 7a10.9 10.9 0 0 0 4.12-.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>

              {!is.simple ? <div className="text-xs ui-muted">Hanya angka.</div> : null}
            </div>

            {err ? <div className="text-sm text-red-600 font-semibold">{err}</div> : null}

            <button type="submit" className="ui-btn ui-btn--primary w-full" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>

            <button
              type="button"
              className="ui-btn w-full"
              disabled={loading}
              onClick={() => navigate({ pathname: "/register", search: location.search })}
            >
              Register
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
