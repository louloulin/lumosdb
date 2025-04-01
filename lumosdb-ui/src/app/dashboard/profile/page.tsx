"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, Key, Loader, Settings, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getApiKeys, createApiKey, deleteApiKey, User as UserType } from "@/lib/api/auth"

// 模拟更新个人资料API
const updateProfile = async (data: { name: string; email: string }): Promise<UserType> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 获取当前认证上下文中的用户
      const currentUser = window?.localStorage.getItem('currentUser');
      if (!currentUser) {
        reject(new Error('User not found'));
        return;
      }
      
      const user = JSON.parse(currentUser);
      // 更新用户信息
      const updatedUser = {
        ...user,
        name: data.name,
        email: data.email
      };
      
      // 保存更新后的用户信息到localStorage
      window.localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      resolve(updatedUser);
    }, 800);
  });
};

// 模拟更改密码API
const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 在实际应用中会与后端API交互，验证当前密码并更新新密码
      if (currentPassword === 'oldpassword') {
        resolve();
      } else {
        reject(new Error('Current password is incorrect'));
      }
    }, 800);
  });
};

// 获取用户API密钥
const getUserApiKeys = async () => {
  return getApiKeys();
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  
  const [activeTab, setActiveTab] = useState("profile")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = useState("")

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      loadApiKeys()
    }
  }, [user])

  const loadApiKeys = async () => {
    try {
      const keys = await getUserApiKeys()
      setApiKeys(keys)
    } catch (err) {
      console.error("Failed to load API keys:", err)
      setError("Failed to load API keys")
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const updatedUser = await updateProfile({ name, email })
      // 在实际环境中，应该通过Context更新用户信息
      setSuccess("Profile updated successfully")
    } catch (err) {
      console.error("Failed to update profile:", err)
      setError("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccess("Password changed successfully")
    } catch (err) {
      console.error("Failed to change password:", err)
      setError("Failed to change password. Please check your current password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      setError("API key name is required")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")
    setNewlyCreatedKey("")

    try {
      const { apiKey, secret } = await createApiKey({
        name: newKeyName,
        permissions: ['read', 'write']
      })
      setApiKeys([...apiKeys, apiKey])
      setNewKeyName("")
      setNewlyCreatedKey(secret) // Store the full key to display to the user
      setSuccess("API key created successfully")
    } catch (err) {
      console.error("Failed to create API key:", err)
      setError("Failed to create API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      await deleteApiKey(keyId)
      setApiKeys(apiKeys.filter(key => key.id !== keyId))
      setSuccess("API key deleted successfully")
    } catch (err) {
      console.error("Failed to delete API key:", err)
      setError("Failed to delete API key")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container max-w-5xl py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to view your profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-6">
      <div className="flex items-center mb-6">
        <Avatar className="h-16 w-16 mr-4">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || "UN"}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="flex items-center">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal information here.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Your email"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for accessing LumosDB programmatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newlyCreatedKey && (
                <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 mb-4">
                  <AlertDescription className="flex flex-col">
                    <strong>Your new API key (copy it now, it won't be shown again):</strong>
                    <code className="mt-2 p-2 bg-yellow-100 rounded font-mono text-sm break-all">
                      {newlyCreatedKey}
                    </code>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreateApiKey} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-key-name">New API Key Name</Label>
                  <Input 
                    id="new-key-name" 
                    value={newKeyName} 
                    onChange={(e) => setNewKeyName(e.target.value)} 
                    placeholder="Enter a name for the API key"
                  />
                </div>
                <Button type="submit" disabled={isLoading || !newKeyName.trim()}>
                  {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </form>
              
              <div className="space-y-2 mt-6">
                <h3 className="text-sm font-medium">Your API Keys</h3>
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You don't have any API keys yet.</p>
                ) : (
                  <div className="border rounded-md divide-y">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(key.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteApiKey(key.id)}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 