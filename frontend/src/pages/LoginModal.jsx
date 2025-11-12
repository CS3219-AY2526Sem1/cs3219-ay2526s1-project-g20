import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import PasswordField from "../components/PasswordField";
import '../css/LoginModal.css';

export default function LoginModal({ onClose }) {
  const { login, register } = useContext(AuthContext);
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setError("");
    if (!isLogin && data.password !== data.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      if (isLogin) {
        // login with email/password
        await login(data.email, data.password);
      } else {
        // signup with email, password, username
        await register({
          email: data.email,
          password: data.password,
          username: data.username,
        });
      }
      onClose?.();
    } catch (err) {
      console.error("Auth error:", err.message);
      setError(err?.message || "Something went wrong");
    }
  }

  return (
    <form className="list login-modal" onSubmit={handleSubmit}>
      {error && <div className="error-msg">{error}</div>}
      <div className="segmented">
        <button
          type="button"
          className={isLogin ? "is-active" : ""}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={!isLogin ? "is-active" : ""}
          onClick={() => setMode("signup")}
        >
          Sign Up
        </button>
      </div>

      {!isLogin && (
        <div>
          <label className="label">Username</label>
          <input
            className="input"
            name="username"
            placeholder="Alex_Chen"
            required
          />
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input
          className="input"
          name="email"
          type="email"
          placeholder="alex@example.com"
          required
        />
      </div>

      <div>
        <PasswordField 
          label="Password (min. 8 characters, including at least one uppercase, one lowercase, one number, and one special character)"
          name="password"
          required
        />
      </div>

      {!isLogin && (
        <div>
          <PasswordField 
            label="Confirm Password"
            name="confirmPassword"
            required
          />
        </div>
      )}

      <button className="btn btn--dark submit-btn" type="submit">
        {isLogin ? "Login" : "Create Account"}
      </button>
    </form>
  );
}