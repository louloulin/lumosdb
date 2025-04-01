"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin, logout as apiLogout, register as apiRegister, getCurrentUser, User } from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAuthenticated = !!user;

  // 检查用户是否已经登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError("Failed to authenticate");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 登录函数
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user } = await apiLogin(email, password);
      setUser(user);
      
      // 登录成功后重定向到控制面板
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 注册函数
  const register = async (data: { email: string; password: string; name: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { user } = await apiRegister(data);
      setUser(user);
      
      // 注册成功后重定向到控制面板
      router.push("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Failed to register");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 退出登录函数
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await apiLogout();
      setUser(null);
      
      // 退出登录后重定向到登录页面
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 自定义钩子，用于在组件中访问认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
} 