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
  derivePassword,
} from "../utils/authIdentity.js";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { is } = useUiLevelFirestore();
  const { pushToast } = useToast();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const u = useMemo(() => normalizeUsername(username), [username]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!u) return setErr("Username wajib diisi.");
    if (!isValidUsername(u)) return setErr("Username minimal 3 karakter (huruf/angka).");

    const p = sanitizePin(pin);
    if (!isValidPin(p)) return setErr("PIN harus 4 digit.");

    const email = usernameToEmail(u);
    const password = derivePassword(u, p);

    try {
      setLoading(true);
      await register(email, password);
      pushToast({ title: "Register berhasil", message: "Akun dibuat ✅", icon: "✅", ttl: 2000 });
      navigate({ pathname: "/login", search: location.search }, { replace: true });
    } catch (e2) {
      const code = e2?.code || "";
      const msg =
        code === "auth/email-already-in-use"
          ? "Username sudah dipakai. Coba yang lain."
          : e2?.message || "Register gagal.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <section className="ui-card ui-card--pattern p-6">
          <div className="ui-title text-2xl font-extrabold">Register</div>

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

              <div className={`ui-pinWrap ${showPin ? "is-pin-visible" : ""}`}>
                <input
                  value={pin}
                  onChange={(e) => setPin(sanitizePin(e.target.value))}
                  className="ui-input ui-input--pin"
                  placeholder="1234"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  autoComplete="new-password"
                  name="bn_pin"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="ui-eyeHit"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                  title={showPin ? "Sembunyikan" : "Lihat"}
                  disabled={loading}
                />
              </div>

              {!is.simple ? <div className="text-xs ui-muted">Hanya angka.</div> : null}
            </div>

            {err ? <div className="text-sm text-red-600 font-semibold">{err}</div> : null}

            <button type="submit" className="ui-btn ui-btn--primary w-full" disabled={loading}>
              {loading ? "Loading..." : "Register"}
            </button>

            <button
              type="button"
              className="ui-btn w-full"
              disabled={loading}
              onClick={() => navigate({ pathname: "/login", search: location.search })}
            >
              Login
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
