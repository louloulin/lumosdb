'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/components/ui/use-toast'
import { generalSettingsSchema, databaseSettingsSchema, securitySettingsSchema, uiSettingsSchema } from '@/lib/schemas/settings'
import { GeneralSettings } from '@/components/settings/general-settings'
import { DatabaseSettings } from '@/components/settings/database-settings'
import { SecuritySettings } from '@/components/settings/security-settings'
import { UISettings } from '@/components/settings/ui-settings'
import { ApiConfig } from '@/lib/api-config'
import { Loader2 } from 'lucide-react'

// 默认设置
const DEFAULT_SETTINGS = {
  general: {
    theme: 'light',
    language: 'zh-CN',
    autoSave: true,
    confirmOnDelete: true
  },
  database: {
    maxConnections: 5,
    timeout: 30000,
    cachingEnabled: true,
    defaultPageSize: 20
  },
  security: {
    apiKeyEnabled: false,
    apiKeyValue: '',
    authRequired: false,
    sessionTimeout: 3600
  },
  ui: {
    compactMode: false,
    enableAnimations: true,
    showHiddenFiles: false,
    editorFontSize: 14
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // 初始化设置
  useEffect(() => {
    fetchSettings()
  }, [])

  // 获取设置
  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${ApiConfig.apiBaseUrl}/api/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        console.error('Failed to fetch settings')
        toast({
          variant: 'destructive',
          title: "获取设置失败",
          description: "无法从服务器获取设置信息"
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        variant: 'destructive',
        title: "获取设置失败",
        description: "连接服务器时发生错误"
      })
    } finally {
      setLoading(false)
    }
  }

  // 保存设置
  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${ApiConfig.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        toast({
          title: "设置已保存",
          description: "您的设置已成功更新"
        })
      } else {
        toast({
          variant: 'destructive',
          title: "保存设置失败",
          description: "服务器无法保存您的设置"
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: "保存设置失败",
        description: "连接服务器时发生错误"
      })
    } finally {
      setSaving(false)
    }
  }

  // 重置设置
  const resetSettings = async () => {
    const confirmReset = window.confirm("确定要重置所有设置吗？这将恢复所有默认值。")
    if (!confirmReset) return
    
    try {
      const response = await fetch(`${ApiConfig.apiBaseUrl}/api/settings/reset`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast({
          title: "设置已重置",
          description: "所有设置已恢复默认值"
        })
      } else {
        toast({
          variant: 'destructive',
          title: "重置设置失败",
          description: "服务器无法重置您的设置"
        })
      }
    } catch (error) {
      console.error('Error resetting settings:', error)
      toast({
        variant: 'destructive',
        title: "重置设置失败",
        description: "连接服务器时发生错误"
      })
    }
  }

  // 更新设置处理函数
  const handleUpdateSettings = (category: string, values: Record<string, any>) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...values
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载设置...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <PageHeader 
        title="设置" 
        description="自定义 LumosDB 的行为和外观"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={resetSettings}>重置</Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存设置
            </Button>
          </div>
        }
      />
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">常规设置</TabsTrigger>
          <TabsTrigger value="database">数据库设置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="ui">界面设置</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>常规设置</CardTitle>
              <CardDescription>管理应用的基本行为</CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettings 
                settings={settings.general}
                onUpdate={(values) => handleUpdateSettings('general', values)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>数据库设置</CardTitle>
              <CardDescription>配置数据库连接和性能参数</CardDescription>
            </CardHeader>
            <CardContent>
              <DatabaseSettings 
                settings={settings.database}
                onUpdate={(values) => handleUpdateSettings('database', values)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>安全设置</CardTitle>
              <CardDescription>管理访问控制和API安全</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettings 
                settings={settings.security}
                onUpdate={(values) => handleUpdateSettings('security', values)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ui" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>界面设置</CardTitle>
              <CardDescription>自定义用户界面的外观和行为</CardDescription>
            </CardHeader>
            <CardContent>
              <UISettings 
                settings={settings.ui}
                onUpdate={(values) => handleUpdateSettings('ui', values)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 