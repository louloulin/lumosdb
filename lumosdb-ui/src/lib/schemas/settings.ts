import { z } from "zod"

// 常规设置验证模式
export const generalSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["zh-CN", "en-US", "ja-JP"]).default("zh-CN"),
  autoSave: z.boolean().default(true),
  confirmOnDelete: z.boolean().default(true),
})

// 数据库设置验证模式
export const databaseSettingsSchema = z.object({
  maxConnections: z.number().int().min(1).max(20).default(5),
  timeout: z.number().int().min(1000).max(120000).default(30000),
  cachingEnabled: z.boolean().default(true),
  defaultPageSize: z.number().int().min(5).max(100).default(20),
})

// 安全设置验证模式
export const securitySettingsSchema = z.object({
  apiKeyEnabled: z.boolean().default(false),
  apiKeyValue: z.string().optional(),
  authRequired: z.boolean().default(false),
  sessionTimeout: z.number().int().min(300).max(86400).default(3600),
})

// 界面设置验证模式
export const uiSettingsSchema = z.object({
  compactMode: z.boolean().default(false),
  enableAnimations: z.boolean().default(true),
  showHiddenFiles: z.boolean().default(false),
  editorFontSize: z.number().int().min(10).max(24).default(14),
})

// 所有设置验证模式
export const settingsSchema = z.object({
  general: generalSettingsSchema,
  database: databaseSettingsSchema,
  security: securitySettingsSchema,
  ui: uiSettingsSchema,
})

// 设置类型
export type GeneralSettings = z.infer<typeof generalSettingsSchema>
export type DatabaseSettings = z.infer<typeof databaseSettingsSchema>
export type SecuritySettings = z.infer<typeof securitySettingsSchema>
export type UISettings = z.infer<typeof uiSettingsSchema>
export type Settings = z.infer<typeof settingsSchema> 