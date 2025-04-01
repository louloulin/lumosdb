"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/api/auth";

// Mock user data to avoid backend dependency
const mockUser: User = {
  id: "1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  avatar: "/avatar.png",
  createdAt: "2024-01-01",
  lastLogin: new Date().toISOString()
};

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
  const [user, setUser] = useState<User | null>(mockUser); // Start with mock user
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAuthenticated = true; // Always authenticated for demo

  // Login function
  const login = async (_email: string, _password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call your API
      setUser(mockUser);
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (data: { email: string; password: string; name: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would call your API
      const newUser = {
        ...mockUser,
        email: data.email,
        name: data.name
      };
      setUser(newUser);
      router.push("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Failed to register");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would call your API
      setUser(null);
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

// Custom hook to access the auth context in components
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
} 