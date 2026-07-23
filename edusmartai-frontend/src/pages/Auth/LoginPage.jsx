// src/pages/Auth/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Input from "../../components/UI/Input";
import Button from "../../components/UI/Button";

/**
 * Demo credentials shown on the login screen, sourced from build-time env vars.
 *
 * Previously these were hardcoded, which meant any public deployment published
 * a working admin password to every visitor. Now nothing is rendered unless the
 * deployment explicitly opts in, and the admin account is never listed — an
 * evaluator does not need destructive access to assess the project.
 */
const DEMO_ACCOUNTS = [
  {
    label: "Student",
    email: process.env.REACT_APP_DEMO_STUDENT_EMAIL,
    password: process.env.REACT_APP_DEMO_STUDENT_PASSWORD,
  },
  {
    label: "Lecturer",
    email: process.env.REACT_APP_DEMO_LECTURER_EMAIL,
    password: process.env.REACT_APP_DEMO_LECTURER_PASSWORD,
  },
].filter((a) => a.email && a.password);

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};

    if (!email) {
      e.email = "Email is required.";
    } else if (!email.includes("@")) {
      e.email = "Please enter a valid email.";
    }

    if (!password) {
      e.password = "Password is required.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(email, password);

      // Redirect based on role
      if (user.role === "student") {
        navigate("/student");
      } else if (user.role === "lecturer") {
        navigate("/lecturer");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login error", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Login failed. Please check your credentials.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-slate-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-100">
        {/* Logo / Title */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
            E
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              EduSmartAI
            </h1>
            <p className="text-xs text-slate-500">
              Smart University Portal
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="e.g. ahmed@edu.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          {serverError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>

          <p className="text-[10px] text-slate-500 text-center mt-2">
            Use your university email and password. Contact support if you forget
            your credentials.
          </p>
        </form>

        {/* Demo credentials are injected at build time and are only ever
            rendered for a synthetic-data instance. They are never bundled for
            a build that points at real records, and the admin account is
            deliberately not advertised. */}
        {DEMO_ACCOUNTS.length > 0 && (
          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Demo accounts (synthetic data):
            </p>
            <div className="text-[10px] text-slate-500 space-y-1">
              {DEMO_ACCOUNTS.map(({ label, email, password }) => (
                <p key={label}>
                  <strong>{label}:</strong> {email} / {password}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
