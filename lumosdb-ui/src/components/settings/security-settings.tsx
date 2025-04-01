'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SecuritySettings as SecuritySettingsType, securitySettingsSchema } from '@/lib/schemas/settings'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'

interface SecuritySettingsProps {
  settings: SecuritySettingsType
  onUpdate: (values: Partial<SecuritySettingsType>) => void
}

export function SecuritySettings({ settings, onUpdate }: SecuritySettingsProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const form = useForm<SecuritySettingsType>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: settings,
  })

  // 当设置变化时，更新表单值
  useEffect(() => {
    form.reset(settings)
  }, [settings, form])

  // 表单值变化时，触发更新
  const handleFormChange = (name: keyof SecuritySettingsType, value: any) => {
    onUpdate({ [name]: value })
  }

  // 生成随机 API Key
  const generateApiKey = () => {
    const key = Array(32)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')
    
    form.setValue('apiKeyValue', key)
    handleFormChange('apiKeyValue', key)
  }

  // 复制 API Key 到剪贴板
  const copyApiKey = () => {
    navigator.clipboard.writeText(form.getValues('apiKeyValue') || '')
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="apiKeyEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">启用 API Key</FormLabel>
                <FormDescription>
                  为 API 请求启用 API Key 认证
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('apiKeyEnabled', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('apiKeyEnabled') && (
          <FormField
            control={form.control}
            name="apiKeyValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <div className="flex-1 relative">
                      <Input
                        {...field}
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="您的 API Key"
                        onChange={(e) => {
                          field.onChange(e.target.value)
                          handleFormChange('apiKeyValue', e.target.value)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </FormControl>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={copyApiKey}
                  >
                    <Copy size={16} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={generateApiKey}
                  >
                    <RefreshCw size={16} />
                  </Button>
                </div>
                <FormDescription>
                  用于访问 API 的密钥
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="authRequired"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">需要身份认证</FormLabel>
                <FormDescription>
                  要求用户登录后才能使用应用
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('authRequired', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sessionTimeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>会话超时 (秒)</FormLabel>
              <div className="flex items-center gap-4">
                <FormControl>
                  <Slider
                    value={[field.value]}
                    min={300}
                    max={86400}
                    step={300}
                    className="flex-1"
                    onValueChange={(value) => {
                      field.onChange(value[0])
                      handleFormChange('sessionTimeout', value[0])
                    }}
                  />
                </FormControl>
                <div className="w-24 text-center font-medium">
                  {Math.floor(field.value / 3600) > 0 ? 
                    `${Math.floor(field.value / 3600)}小时` : 
                    `${Math.floor(field.value / 60)}分钟`}
                </div>
              </div>
              <FormDescription>
                用户会话的超时时间，超时后需要重新登录
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
} 