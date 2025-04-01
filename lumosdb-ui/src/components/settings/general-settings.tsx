'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GeneralSettings as GeneralSettingsType, generalSettingsSchema } from '@/lib/schemas/settings'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useEffect } from 'react'

interface GeneralSettingsProps {
  settings: GeneralSettingsType
  onUpdate: (values: Partial<GeneralSettingsType>) => void
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  const form = useForm<GeneralSettingsType>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: settings,
  })

  // 当设置变化时，更新表单值
  useEffect(() => {
    form.reset(settings)
  }, [settings, form])

  // 表单值变化时，触发更新
  const handleFormChange = (name: keyof GeneralSettingsType, value: any) => {
    onUpdate({ [name]: value })
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>主题</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  handleFormChange('theme', value)
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择主题" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="light">浅色</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="system">跟随系统</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                选择应用的显示主题
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>语言</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  handleFormChange('language', value)
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择语言" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="zh-CN">中文 (简体)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="ja-JP">日本語</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                选择界面显示语言
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoSave"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">自动保存</FormLabel>
                <FormDescription>
                  自动保存查询和编辑器内容
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('autoSave', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmOnDelete"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">删除确认</FormLabel>
                <FormDescription>
                  删除数据前显示确认对话框
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('confirmOnDelete', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
} 