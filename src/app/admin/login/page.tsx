"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const submitting = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "" : "Enter a valid email address.",
      password: password.trim() ? "" : "Enter your password.",
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      (nextErrors.email ? emailInput : passwordInput).current?.focus();
      return;
    }
    submitting.current = true;
    setLoading(true);
    let navigating = false;
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      if (!response.ok) {
        setError(response.status === 401
          ? "That email and password don’t match. Please try again."
          : "We couldn’t sign you in right now. Please try again shortly.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.admin.name ?? "");
      localStorage.setItem("email", data.admin.email ?? "");
      localStorage.setItem("image", data.admin.image ?? "");
      router.push("/admin/dashboard");
      navigating = true;
    } catch {
      setError("We couldn’t complete sign-in. Check your connection and try again.");
    } finally {
      if (!navigating) {
        submitting.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.brandPanel} aria-label="Anchor Into Presence">
          <div className={styles.brand}>
            <Image src="/assets/images/anchor-into-presence-logo.png" alt="" width={56} height={56} priority />
            <div><strong>Anchor Into Presence</strong><span>Admin workspace</span></div>
          </div>
          <div className={styles.brandMessage}>
            <h2>Welcome back!</h2>
            <p>Enter your email and password<br />to continue to your workspace.</p>
          </div>
          <p className={styles.brandFooter}>Small moments. Lasting connection.</p>
        </aside>

        <section className={styles.formPanel} aria-labelledby="login-title">
          <div className={styles.formContent}>
            <h1 id="login-title">Sign in</h1>
            <p className={styles.intro}>TO YOUR ADMIN WORKSPACE</p>
            <form onSubmit={handleLogin} noValidate aria-busy={loading}>
              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <div className={`${styles.inputWrap} ${errors.email ? styles.invalid : ""}`}>
                  <Mail size={19} aria-hidden="true" />
                  <input ref={emailInput} id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" value={email} disabled={loading} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} onChange={event => { setEmail(event.target.value); setErrors(previous => ({ ...previous, email: "" })); setError(""); }} />
                </div>
                {errors.email && <p id="email-error" className={styles.fieldError}>{errors.email}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="loginPassword">Password</label>
                <div className={`${styles.inputWrap} ${errors.password ? styles.invalid : ""}`}>
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input ref={passwordInput} id="loginPassword" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} disabled={loading} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} onChange={event => { setPassword(event.target.value); setErrors(previous => ({ ...previous, password: "" })); setError(""); }} />
                  <button className={styles.eyeButton} type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button>
                </div>
                {errors.password && <p id="password-error" className={styles.fieldError}>{errors.password}</p>}
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <button className={styles.submit} type="submit" disabled={loading}>
                <span>{loading ? "Signing in…" : "Sign in"}</span>
                {loading ? <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
              </button>
              <p className={styles.loadingStatus} role="status">{loading ? "Signing in. Please wait." : ""}</p>
            </form>
            <p className={styles.accessNote}>For authorized team members only.<br />Need access? Contact your workspace administrator.</p>
          </div>
          <p className={styles.formFooter}>Anchor Into Presence · Admin workspace</p>
        </section>
      </div>
    </main>
  );
}
