// 用户类型定义
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  createdBy: string;
  permissions: string[];
  expiresAt?: string;
}

// 模拟用户数据
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: '2024-01-15',
    lastLogin: '2024-03-30',
  },
  {
    id: '2',
    email: 'developer@example.com',
    name: 'Developer User',
    role: 'developer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer',
    createdAt: '2024-02-20',
    lastLogin: '2024-03-28',
  },
  {
    id: '3',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'viewer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer',
    createdAt: '2024-03-10',
    lastLogin: '2024-03-25',
  },
];

// 模拟API密钥
const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production API Key',
    prefix: 'lmdb_prod_',
    createdAt: '2024-02-10',
    lastUsed: '2024-03-29',
    createdBy: '1',
    permissions: ['read', 'write', 'delete'],
  },
  {
    id: '2',
    name: 'Development API Key',
    prefix: 'lmdb_dev_',
    createdAt: '2024-02-15',
    lastUsed: '2024-03-28',
    createdBy: '2',
    permissions: ['read', 'write'],
  },
  {
    id: '3',
    name: 'Read-only API Key',
    prefix: 'lmdb_ro_',
    createdAt: '2024-03-05',
    expiresAt: '2024-06-05',
    createdBy: '1',
    permissions: ['read'],
  },
];

// 保存当前登录用户
let currentUser: User | null = null;

// 登录函数
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers.find(u => u.email === email);
      
      if (!user || password !== 'password') { // 模拟环境中所有用户的密码都是"password"
        reject(new Error('Invalid email or password'));
        return;
      }
      
      // 更新最后登录时间
      user.lastLogin = new Date().toISOString().split('T')[0];
      currentUser = user;
      
      // 模拟返回JWT令牌
      const token = `mock_jwt_token_${user.id}_${Date.now()}`;
      
      resolve({ user, token });
    }, 800); // 模拟网络延迟
  });
}

// 注册函数
export async function register(data: { 
  email: string; 
  password: string; 
  name: string;
}): Promise<{ user: User; token: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 检查邮箱是否已被使用
      const existingUser = mockUsers.find(u => u.email === data.email);
      if (existingUser) {
        reject(new Error('Email already in use'));
        return;
      }
      
      // 创建新用户
      const newUser: User = {
        id: `${mockUsers.length + 1}`,
        email: data.email,
        name: data.name,
        role: 'viewer', // 默认角色为viewer
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name.replace(/\s+/g, '')}`,
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0],
      };
      
      // 添加到用户列表
      mockUsers.push(newUser);
      currentUser = newUser;
      
      // 模拟返回JWT令牌
      const token = `mock_jwt_token_${newUser.id}_${Date.now()}`;
      
      resolve({ user: newUser, token });
    }, 1000);
  });
}

// 获取当前用户信息
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(currentUser);
    }, 300);
  });
}

// 退出登录
export async function logout(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = null;
      resolve();
    }, 300);
  });
}

// 获取所有用户（仅限管理员）
export async function getAllUsers(): Promise<User[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser || currentUser.role !== 'admin') {
        reject(new Error('Unauthorized'));
        return;
      }
      
      resolve([...mockUsers]);
    }, 500);
  });
}

// 更新用户角色（仅限管理员）
export async function updateUserRole(userId: string, role: User['role']): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser || currentUser.role !== 'admin') {
        reject(new Error('Unauthorized'));
        return;
      }
      
      const userToUpdate = mockUsers.find(u => u.id === userId);
      if (!userToUpdate) {
        reject(new Error('User not found'));
        return;
      }
      
      userToUpdate.role = role;
      resolve({...userToUpdate});
    }, 500);
  });
}

// 删除用户（仅限管理员）
export async function deleteUser(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser || currentUser.role !== 'admin') {
        reject(new Error('Unauthorized'));
        return;
      }
      
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        reject(new Error('User not found'));
        return;
      }
      
      if (userId === currentUser.id) {
        reject(new Error('Cannot delete your own account'));
        return;
      }
      
      mockUsers.splice(userIndex, 1);
      resolve();
    }, 500);
  });
}

// API密钥管理

// 获取API密钥
export async function getApiKeys(): Promise<ApiKey[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser) {
        reject(new Error('Unauthorized'));
        return;
      }
      
      // 管理员可以看到所有API密钥
      if (currentUser.role === 'admin') {
        resolve([...mockApiKeys]);
        return;
      }
      
      // 非管理员只能看到自己创建的API密钥
      const userKeys = mockApiKeys.filter(key => key.createdBy === currentUser.id);
      resolve(userKeys);
    }, 500);
  });
}

// 创建API密钥
export async function createApiKey(data: {
  name: string;
  permissions: string[];
  expiresAt?: string;
}): Promise<{ apiKey: ApiKey; secret: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser) {
        reject(new Error('Unauthorized'));
        return;
      }
      
      // 只有管理员和开发者可以创建API密钥
      if (currentUser.role !== 'admin' && currentUser.role !== 'developer') {
        reject(new Error('Not authorized to create API keys'));
        return;
      }
      
      // 生成随机密钥前缀
      const prefix = `lmdb_${Math.random().toString(36).substring(2, 8)}_`;
      
      // 生成随机密钥（在实际应用中，这会是一个更长、更安全的字符串）
      const secret = `${prefix}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      // 创建新API密钥
      const newApiKey: ApiKey = {
        id: `${mockApiKeys.length + 1}`,
        name: data.name,
        prefix,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: currentUser?.id || '', // 使用可选链操作符和默认值
        permissions: data.permissions,
        expiresAt: data.expiresAt,
      };
      
      mockApiKeys.push(newApiKey);
      
      resolve({ apiKey: newApiKey, secret });
    }, 800);
  });
}

// 删除API密钥
export async function deleteApiKey(keyId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser) {
        reject(new Error('Unauthorized'));
        return;
      }
      
      const keyIndex = mockApiKeys.findIndex(key => key.id === keyId);
      
      if (keyIndex === -1) {
        reject(new Error('API key not found'));
        return;
      }
      
      const key = mockApiKeys[keyIndex];
      
      // 管理员可以删除任何密钥，其他用户只能删除自己创建的密钥
      if (currentUser.role !== 'admin' && key.createdBy !== currentUser.id) {
        reject(new Error('Not authorized to delete this API key'));
        return;
      }
      
      mockApiKeys.splice(keyIndex, 1);
      resolve();
    }, 500);
  });
} 