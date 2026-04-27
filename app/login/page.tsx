"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Coins, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Coins size={20} color="#0D0020" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              ROBUX
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--accent-gold)", letterSpacing: "-0.02em" }}>
              DESK
            </span>
          </div>
        </div>

        <h2 style={{ fontWeight: 700, fontSize: 22, color: "var(--text-primary)", marginBottom: 8 }}>
          เข้าสู่ระบบ
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>
          สำหรับเจ้าของระบบเท่านั้น
        </p>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(225,29,72,0.07)",
              border: "1px solid rgba(225,29,72,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--accent-red)",
            }}
          >
            {error}
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label className="label">อีเมล</label>
          <input
            className="input-base"
            type="email"
            placeholder="admin@robuxdest.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 28 }}>
          <label className="label">รหัสผ่าน</label>
          <div style={{ position: "relative" }}>
            <input
              className="input-base"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{ paddingRight: 44 }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 14 }}
          onClick={handleLogin}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <span style={{ opacity: 0.7 }}>กำลังเข้าสู่ระบบ...</span>
          ) : (
            <><LogIn size={15} /> เข้าสู่ระบบ</>
          )}
        </button>
      </div>
    </div>
  );
}