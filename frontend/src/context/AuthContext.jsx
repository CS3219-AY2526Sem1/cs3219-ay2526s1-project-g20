import React, { createContext, useState, useEffect } from "react";
import { getProfile, loginUser, registerUser } from "../api/userService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const profile = await getProfile();
          setUser(profile);
        } catch {
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username, password) => {
    await loginUser(username, password);
    const profile = await getProfile();
    setUser(profile);
  };

  const register = async (data) => {
    const { user } = await registerUser(data);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
