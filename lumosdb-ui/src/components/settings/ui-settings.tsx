'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UISettings as UISettingsType, uiSettingsSchema } from '@/lib/schemas/settings'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useEffect } from 'react'

interface UISettingsProps {
  settings: UISettingsType
  onUpdate: (values: Partial<UISettingsType>) => void
}

export function UISettings({ settings, onUpdate }: UISettingsProps) {
  const form = useForm<UISettingsType>({
    resolver: zodResolver(uiSettingsSchema),
    defaultValues: settings,
  })

  // 当设置变化时，更新表单值
  useEffect(() => {
    form.reset(settings)
  }, [settings, form])

  // 表单值变化时，触发更新
  const handleFormChange = (name: keyof UISettingsType, value: any) => {
    onUpdate({ [name]: value })
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="compactMode"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">紧凑模式</FormLabel>
                <FormDescription>
                  减少界面间距以显示更多内容
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('compactMode', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableAnimations"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">启用动画</FormLabel>
                <FormDescription>
                  界面元素过渡时显示动画效果
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('enableAnimations', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showHiddenFiles"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">显示隐藏文件</FormLabel>
                <FormDescription>
                  在文件浏览器中显示隐藏文件和目录
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked)
                    handleFormChange('showHiddenFiles', checked)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="editorFontSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>编辑器字体大小</FormLabel>
              <div className="flex items-center gap-4">
                <FormControl>
                  <Slider
                    value={[field.value]}
                    min={10}
                    max={24}
                    step={1}
                    className="flex-1"
                    onValueChange={(value) => {
                      field.onChange(value[0])
                      handleFormChange('editorFontSize', value[0])
                    }}
                  />
                </FormControl>
                <span className="w-16 text-center font-medium">
                  {field.value}px
                </span>
              </div>
              <FormDescription>
                代码编辑器的字体大小
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
} 