"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { 
  getAllUsers, updateUserRole, deleteUser, 
  getApiKeys, createApiKey, deleteApiKey, 
  User, ApiKey
} from "@/lib/api/auth";
import { 
  AlertCircle, User as UserIcon, Lock, Key, Plus, MoreHorizontal, Shield,
  Trash2, Loader2, Copy, Check, Clock, Eye, RefreshCw
} from "lucide-react";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState({
    users: true,
    apiKeys: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<User['role'] | "">("");
  const [newApiKeyData, setNewApiKeyData] = useState({
    name: "",
    permissions: ["read"] as string[],
  });
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<{ apiKey: ApiKey; secret: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 加载用户数据
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(prev => ({ ...prev, users: true }));
      
      try {
        const usersData = await getAllUsers();
        setUsers(usersData);
        setError(null);
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Failed to load users. You may not have permission to view this data.");
      } finally {
        setLoading(prev => ({ ...prev, users: false }));
      }
    };

    loadUsers();
  }, []);

  // 加载API密钥数据
  useEffect(() => {
    const loadApiKeys = async () => {
      setLoading(prev => ({ ...prev, apiKeys: true }));
      
      try {
        const keys = await getApiKeys();
        setApiKeys(keys);
      } catch (err) {
        console.error("Failed to load API keys:", err);
      } finally {
        setLoading(prev => ({ ...prev, apiKeys: false }));
      }
    };

    if (activeTab === "api-keys") {
      loadApiKeys();
    }
  }, [activeTab]);

  // 更新用户角色
  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      await updateUserRole(selectedUser.id, selectedRole as User['role']);
      
      // 更新用户列表
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, role: selectedRole as User['role'] } : u
      ));
      
      setRoleDialogOpen(false);
    } catch (err) {
      console.error("Failed to update user role:", err);
      setError("Failed to update user role");
    }
  };

  // 删除用户
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser.id);
      
      // 从列表中移除用户
      setUsers(users.filter(u => u.id !== selectedUser.id));
      
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user");
    }
  };

  // 创建新API密钥
  const handleCreateApiKey = async () => {
    try {
      const result = await createApiKey(newApiKeyData);
      
      // 更新API密钥列表
      setApiKeys([result.apiKey, ...apiKeys]);
      
      // 保存创建的密钥以显示
      setCreatedApiKey(result);
      
      // 重置表单
      setNewApiKeyData({
        name: "",
        permissions: ["read"],
      });
    } catch (err) {
      console.error("Failed to create API key:", err);
      setError("Failed to create API key");
    }
  };

  // 删除API密钥
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      await deleteApiKey(keyId);
      
      // 从列表中移除密钥
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
    } catch (err) {
      console.error("Failed to delete API key:", err);
      setError("Failed to delete API key");
    }
  };

  // 复制API密钥到剪贴板
  const copyApiKeyToClipboard = () => {
    if (!createdApiKey) return;
    
    navigator.clipboard.writeText(createdApiKey.secret).then(() => {
      setCopiedSecret(true);
      
      // 3秒后重置复制状态
      setTimeout(() => setCopiedSecret(false), 3000);
    });
  };

  // 角色徽章颜色
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'developer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // 获取用户头像首字母
  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // 检查当前用户是否是管理员
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users and API keys for LumosDB
          </p>
        </div>
        
        {activeTab === "api-keys" && (isAdmin || currentUser?.role === 'developer') && (
          <Button onClick={() => setApiKeyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New API Key
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">
            <UserIcon className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading.users ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: '40%' }}>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>{getAvatarInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.createdAt}</TableCell>
                          <TableCell>{user.lastLogin || "Never"}</TableCell>
                          <TableCell className="text-right">
                            {isAdmin && currentUser?.id !== user.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setSelectedRole(user.role);
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to LumosDB
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading.apiKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 border rounded-md">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">No API keys found</p>
                  {(isAdmin || currentUser?.role === 'developer') && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setApiKeyDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: '30%' }}>Name</TableHead>
                        <TableHead>Prefix</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((apiKey) => (
                        <TableRow key={apiKey.id}>
                          <TableCell className="font-medium">{apiKey.name}</TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-1 py-0.5 text-xs">
                              {apiKey.prefix}...
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {apiKey.permissions.map(perm => (
                                <Badge key={perm} variant="outline">
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{apiKey.createdAt}</TableCell>
                          <TableCell>
                            {apiKey.expiresAt ? apiKey.expiresAt : "Never"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteApiKey(apiKey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 修改用户角色对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedUser?.avatar} alt={selectedUser?.name} />
                  <AvatarFallback>{selectedUser ? getAvatarInitials(selectedUser.name) : ''}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedUser?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">Role</label>
                <Select
                  value={selectedRole}
                  onValueChange={value => setSelectedRole(value as User['role'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm">
                <p className="font-medium mb-1">Role permissions:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <Badge variant="default">Admin</Badge>
                    <span className="text-muted-foreground">Full access to all features and user management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary">Developer</Badge>
                    <span className="text-muted-foreground">Access to all features but not user management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">Viewer</Badge>
                    <span className="text-muted-foreground">Read-only access to databases and collections</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除用户确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedUser?.avatar} alt={selectedUser?.name} />
                <AvatarFallback>{selectedUser ? getAvatarInitials(selectedUser.name) : ''}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{selectedUser?.name}</div>
                <div className="text-sm text-muted-foreground">{selectedUser?.email}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建API密钥对话框 */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access to LumosDB
            </DialogDescription>
          </DialogHeader>
          
          {createdApiKey ? (
            <div className="py-4 space-y-4">
              <Alert className="border-green-500 text-green-500">
                <Check className="h-4 w-4" />
                <AlertTitle>API Key Created</AlertTitle>
                <AlertDescription>
                  Your new API key has been created. Make sure to copy it now as you won't be able to see it again.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Key</label>
                <div className="relative">
                  <Input
                    readOnly
                    value={createdApiKey.secret}
                    className="pr-10 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={copyApiKeyToClipboard}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This key will not be shown again. Please store it securely.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key Details</label>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{createdApiKey.apiKey.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prefix:</span>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {createdApiKey.apiKey.prefix}
                    </code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Permissions:</span>
                    <div className="flex gap-1">
                      {createdApiKey.apiKey.permissions.map(perm => (
                        <Badge key={perm} variant="outline">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  placeholder="Production API Key"
                  value={newApiKeyData.name}
                  onChange={e => setNewApiKeyData(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to identify this API key
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Permissions</label>
                <div className="flex gap-2">
                  <Button
                    variant={newApiKeyData.permissions.includes('read') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newPerms = newApiKeyData.permissions.includes('read')
                        ? newApiKeyData.permissions.filter(p => p !== 'read')
                        : [...newApiKeyData.permissions, 'read'];
                      setNewApiKeyData(prev => ({ ...prev, permissions: newPerms }));
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Read
                  </Button>
                  <Button
                    variant={newApiKeyData.permissions.includes('write') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newPerms = newApiKeyData.permissions.includes('write')
                        ? newApiKeyData.permissions.filter(p => p !== 'write')
                        : [...newApiKeyData.permissions, 'write'];
                      setNewApiKeyData(prev => ({ ...prev, permissions: newPerms }));
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Write
                  </Button>
                  <Button
                    variant={newApiKeyData.permissions.includes('delete') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newPerms = newApiKeyData.permissions.includes('delete')
                        ? newApiKeyData.permissions.filter(p => p !== 'delete')
                        : [...newApiKeyData.permissions, 'delete'];
                      setNewApiKeyData(prev => ({ ...prev, permissions: newPerms }));
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the permissions for this API key
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Expiration</label>
                </div>
                <p className="text-xs text-muted-foreground">
                  API keys do not expire by default. Expiration dates will be added in a future update.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            {createdApiKey ? (
              <Button onClick={() => {
                setApiKeyDialogOpen(false);
                setCreatedApiKey(null);
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateApiKey} disabled={!newApiKeyData.name}>
                  Create API Key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 