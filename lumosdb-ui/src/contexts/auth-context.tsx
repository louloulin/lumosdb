"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@sdk";
import * as authService from "@/lib/api/auth-service";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // 初始化时检查用户登录状态
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        // 检查用户是否已登录
        const isLoggedIn = authService.isLoggedIn();
        setIsAuthenticated(isLoggedIn);
        
        if (isLoggedIn) {
          const { user } = await authService.getCurrentUser();
          setUser(user);
        }
      } catch (err) {
        console.error("获取当前用户信息失败:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthStatus();
  }, []);

  // 登录函数
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(email, password);
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      setUser(result.user);
      setIsAuthenticated(true);
      router.push("/dashboard");
    } catch (err) {
      console.error("登录错误:", err);
      setError("登录失败，请检查您的邮箱和密码");
    } finally {
      setIsLoading(false);
    }
  };

  // 注册函数
  const register = async (data: { email: string; password: string; name: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.register(data);
      
      if (result.error) {
        setError(result.error);
        return;
      }
      
      setUser(result.user);
      setIsAuthenticated(true);
      router.push("/dashboard");
    } catch (err) {
      console.error("注册错误:", err);
      setError("注册失败，请检查您的输入");
    } finally {
      setIsLoading(false);
    }
  };

  // 登出函数
  const logout = async () => {
    setIsLoading(true);
    
    try {
      authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      router.push("/auth/login");
    } catch (err) {
      console.error("登出错误:", err);
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

// 自定义钩子以在组件中访问认证上下文
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth必须在AuthProvider内部使用");
  }
  
  return context;
} 