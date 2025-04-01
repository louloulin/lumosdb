import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'

// 设置文件路径
const SETTINGS_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json')

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

// 创建 settings 路由
export const settingsRoutes = new Hono()

// 确保设置目录和文件存在
async function ensureSettingsFileExists() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true })
    try {
      await fs.access(SETTINGS_FILE)
    } catch (error) {
      // 文件不存在，创建默认设置文件
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2))
    }
  } catch (error) {
    console.error('Failed to ensure settings file exists:', error)
  }
}

// 初始化设置文件
ensureSettingsFileExists()

// 获取所有设置
settingsRoutes.get('/', async (c) => {
  try {
    const settingsData = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(settingsData)
    return c.json(settings)
  } catch (error) {
    console.error('Error reading settings:', error)
    return c.json(DEFAULT_SETTINGS)
  }
})

// 获取特定分类的设置
settingsRoutes.get('/:category', async (c) => {
  const category = c.req.param('category')
  try {
    const settingsData = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(settingsData)

    if (settings[category]) {
      return c.json(settings[category])
    } else {
      return c.json({ error: 'Category not found' }, 404)
    }
  } catch (error) {
    console.error(`Error reading ${category} settings:`, error)
    return c.json(DEFAULT_SETTINGS[category] || {})
  }
})

// 更新特定分类的设置
const categorySchema = z.enum(['general', 'database', 'security', 'ui'])

// 更新整个设置
settingsRoutes.put('/', async (c) => {
  try {
    const newSettings = await c.req.json()
    
    // 合并默认设置和新设置，确保所有必要的字段都存在
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...newSettings,
      general: { ...DEFAULT_SETTINGS.general, ...newSettings.general },
      database: { ...DEFAULT_SETTINGS.database, ...newSettings.database },
      security: { ...DEFAULT_SETTINGS.security, ...newSettings.security },
      ui: { ...DEFAULT_SETTINGS.ui, ...newSettings.ui }
    }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(mergedSettings, null, 2))
    return c.json({ success: true, settings: mergedSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return c.json({ error: 'Failed to update settings' }, 500)
  }
})

// 更新特定分类的设置
settingsRoutes.patch('/:category', zValidator('param', z.object({ category: categorySchema })), async (c) => {
  const { category } = c.req.valid('param')
  
  try {
    const settingsData = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(settingsData)
    const categoryUpdate = await c.req.json()
    
    // 更新特定分类的设置
    settings[category] = {
      ...settings[category],
      ...categoryUpdate
    }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return c.json({ success: true, category, settings: settings[category] })
  } catch (error) {
    console.error(`Error updating ${category} settings:`, error)
    return c.json({ error: `Failed to update ${category} settings` }, 500)
  }
})

// 重置所有设置
settingsRoutes.post('/reset', async (c) => {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2))
    return c.json({ success: true, settings: DEFAULT_SETTINGS })
  } catch (error) {
    console.error('Error resetting settings:', error)
    return c.json({ error: 'Failed to reset settings' }, 500)
  }
})

// 重置特定分类的设置
settingsRoutes.post('/reset/:category', zValidator('param', z.object({ category: categorySchema })), async (c) => {
  const { category } = c.req.valid('param')
  
  try {
    const settingsData = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(settingsData)
    
    // 重置特定分类的设置
    settings[category] = { ...DEFAULT_SETTINGS[category] }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return c.json({ success: true, category, settings: settings[category] })
  } catch (error) {
    console.error(`Error resetting ${category} settings:`, error)
    return c.json({ error: `Failed to reset ${category} settings` }, 500)
  }
})

export default settingsRoutes 