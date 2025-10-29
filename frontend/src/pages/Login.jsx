import React, { useState } from "react";
import '../css/Login.css';

export default function LoginModal({ onClose, onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const isLogin = mode === "login";

  function handleSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!isLogin && data.password !== data.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    // Demo auth: accept anything. Hook your real API here.
    const user = {
      name: data.username || "John Doe",
      email: data.email,
    };
    onLogin?.(user);
    onClose?.();
  }

  return (
    <form className="list login-modal" onSubmit={handleSubmit}>
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
            placeholder="Alex Chen"
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
        <label className="label">Password</label>
        <input className="input" name="password" type="password" required />
      </div>

      {!isLogin && (
        <div>
          <label className="label">Confirm Password</label>
          <input
            className="input"
            name="confirmPassword"
            type="password"
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