'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DatabaseSettings as DatabaseSettingsType, databaseSettingsSchema } from '@/lib/schemas/settings'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useEffect } from 'react'

interface DatabaseSettingsProps {
  settings: DatabaseSettingsType
  onUpdate: (values: Partial<DatabaseSettingsType>) => void
}

export function DatabaseSettings({ settings, onUpdate }: DatabaseSettingsProps) {
  const form = useForm<DatabaseSettingsType>({
    resolver: zodResolver(databaseSettingsSchema),
    defaultValues: settings,
  })

  // 当设置变化时，更新表单值
  useEffect(() => {
    form.reset(settings)
  }, [settings, form])

  // 表单值变化时，触发更新
  const handleFormChange = (name: keyof DatabaseSettingsType, value: any) => {
    onUpdate({ [name]: value })
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="maxConnections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>最大连接数</FormLabel>
              <div className="flex items-center gap-4">
                <FormControl>
                  <Slider
                    value={[field.value]}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                    onValueChange={(value) => {
                      field.onChange(value[0])
                      handleFormChange('maxConnections', value[0])
                    }}
                  />
                </FormControl>
                <span className="w-12 text-center font-medium">
                  {field.value}
                </span>
              </div>
              <FormDescription>
                数据库同时连接的最大数量
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>连接超时 (毫秒)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value}
                  min={1000}
                  max={120000}
                  step={1000}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (!isNaN(value)) {
                      field.onChange(value)
                      handleFormChange('timeout', value)
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                数据库连接超时时间，单位毫秒
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cachingEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">启用查询缓存</FormLabel>
                <FormDescription>
                  缓存频繁执行的查询结果，提高性能
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('cachingEnabled', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultPageSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>默认分页大小</FormLabel>
              <div className="flex items-center gap-4">
                <FormControl>
                  <Slider
                    value={[field.value]}
                    min={5}
                    max={100}
                    step={5}
                    className="flex-1"
                    onValueChange={(value) => {
                      field.onChange(value[0])
                      handleFormChange('defaultPageSize', value[0])
                    }}
                  />
                </FormControl>
                <span className="w-12 text-center font-medium">
                  {field.value}
                </span>
              </div>
              <FormDescription>
                每页显示的默认记录数量
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
} 