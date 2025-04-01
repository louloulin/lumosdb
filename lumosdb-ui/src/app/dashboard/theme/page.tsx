"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { 
  Sun, 
  Moon, 
  Monitor, 
  PaintBucket, 
  Palette, 
  Check, 
  RefreshCw, 
  EyeIcon, 
  Brush, 
  CircleSlash, 
  CircleIcon, 
  PanelLeftClose
} from "lucide-react"

// 预定义的颜色主题
const colorThemes = [
  { id: "blue", name: "蓝色", primary: "#3b82f6", secondary: "#60a5fa" },
  { id: "green", name: "绿色", primary: "#22c55e", secondary: "#4ade80" },
  { id: "purple", name: "紫色", primary: "#8b5cf6", secondary: "#a78bfa" },
  { id: "rose", name: "玫瑰", primary: "#e11d48", secondary: "#fb7185" },
  { id: "orange", name: "橙色", primary: "#f97316", secondary: "#fb923c" },
  { id: "slate", name: "深灰", primary: "#64748b", secondary: "#94a3b8" },
  { id: "amber", name: "琥珀", primary: "#f59e0b", secondary: "#fbbf24" },
  { id: "teal", name: "青色", primary: "#14b8a6", secondary: "#2dd4bf" }
]

// 字体选项
const fontOptions = [
  { id: "sans", name: "无衬线 (Sans-serif)", value: "var(--font-sans)" },
  { id: "serif", name: "衬线 (Serif)", value: "Georgia, serif" },
  { id: "mono", name: "等宽 (Monospace)", value: "monospace" },
]

// 圆角设置
const radiusOptions = [
  { id: "none", name: "无圆角", value: "0" },
  { id: "sm", name: "小圆角", value: "0.125rem" },
  { id: "md", name: "中等圆角", value: "0.375rem" },
  { id: "lg", name: "大圆角", value: "0.5rem" },
  { id: "full", name: "完全圆角", value: "9999px" },
]

// 动画设置
const animationOptions = [
  { id: "normal", name: "默认" },
  { id: "reduced", name: "减弱" },
  { id: "none", name: "关闭" },
]

export default function ThemePage() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("appearance")
  const [mounted, setMounted] = useState(false)
  const [selectedColorTheme, setSelectedColorTheme] = useState("blue")
  const [fontSize, setFontSize] = useState(16)
  const [selectedFont, setSelectedFont] = useState("sans")
  const [selectedRadius, setSelectedRadius] = useState("md")
  const [selectedAnimation, setSelectedAnimation] = useState("normal")
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [customTheme, setCustomTheme] = useState(false)
  const [customPrimaryColor, setCustomPrimaryColor] = useState("#3b82f6")
  const [customAccentColor, setCustomAccentColor] = useState("#60a5fa")
  
  // 在组件挂载后初始化状态，避免水合错误
  useEffect(() => {
    setMounted(true)
    
    // 从localStorage读取主题设置
    const storedColorTheme = localStorage.getItem("lumos-color-theme") || "blue"
    const storedFontSize = localStorage.getItem("lumos-font-size") || "16"
    const storedFont = localStorage.getItem("lumos-font") || "sans"
    const storedRadius = localStorage.getItem("lumos-radius") || "md"
    const storedAnimation = localStorage.getItem("lumos-animation") || "normal"
    const storedHighContrast = localStorage.getItem("lumos-high-contrast") === "true"
    const storedReducedMotion = localStorage.getItem("lumos-reduced-motion") === "true"
    const storedCustomTheme = localStorage.getItem("lumos-custom-theme") === "true"
    const storedCustomPrimaryColor = localStorage.getItem("lumos-custom-primary") || "#3b82f6"
    const storedCustomAccentColor = localStorage.getItem("lumos-custom-accent") || "#60a5fa"
    
    setSelectedColorTheme(storedColorTheme)
    setFontSize(parseInt(storedFontSize))
    setSelectedFont(storedFont)
    setSelectedRadius(storedRadius)
    setSelectedAnimation(storedAnimation)
    setHighContrast(storedHighContrast)
    setReducedMotion(storedReducedMotion)
    setCustomTheme(storedCustomTheme)
    setCustomPrimaryColor(storedCustomPrimaryColor)
    setCustomAccentColor(storedCustomAccentColor)
    
    // 应用保存的主题设置
    applyThemeSettings({
      colorTheme: storedColorTheme,
      fontSize: parseInt(storedFontSize),
      font: storedFont,
      radius: storedRadius,
      animation: storedAnimation,
      highContrast: storedHighContrast,
      reducedMotion: storedReducedMotion,
      customTheme: storedCustomTheme,
      customPrimaryColor: storedCustomPrimaryColor,
      customAccentColor: storedCustomAccentColor
    })
  }, [])
  
  // 应用主题设置
  const applyThemeSettings = (settings: {
    colorTheme: string;
    fontSize: number;
    font: string;
    radius: string;
    animation: string;
    highContrast: boolean;
    reducedMotion: boolean;
    customTheme: boolean;
    customPrimaryColor: string;
    customAccentColor: string;
  }) => {
    const root = document.documentElement;
    
    // 设置字体大小
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    
    // 设置字体
    const fontFamily = fontOptions.find(f => f.id === settings.font)?.value || fontOptions[0].value;
    root.style.setProperty('--font-family', fontFamily);
    
    // 设置圆角
    const borderRadius = radiusOptions.find(r => r.id === settings.radius)?.value || radiusOptions[2].value;
    root.style.setProperty('--radius', borderRadius);
    
    // 设置动画
    if (settings.animation === "none" || settings.reducedMotion) {
      root.style.setProperty('--transition-duration', '0s');
    } else if (settings.animation === "reduced") {
      root.style.setProperty('--transition-duration', '0.1s');
    } else {
      root.style.setProperty('--transition-duration', '0.2s');
    }
    
    // 设置高对比度
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // 设置主题色
    if (settings.customTheme) {
      // 使用自定义颜色
      root.style.setProperty('--primary', settings.customPrimaryColor);
      root.style.setProperty('--primary-foreground', '#ffffff');
      root.style.setProperty('--accent', settings.customAccentColor);
    } else {
      // 使用预设主题
      const colorTheme = colorThemes.find(ct => ct.id === settings.colorTheme) || colorThemes[0];
      root.style.setProperty('--primary', colorTheme.primary);
      root.style.setProperty('--primary-foreground', '#ffffff');
      root.style.setProperty('--accent', colorTheme.secondary);
    }
    
    // 存储设置到localStorage
    localStorage.setItem("lumos-color-theme", settings.colorTheme);
    localStorage.setItem("lumos-font-size", settings.fontSize.toString());
    localStorage.setItem("lumos-font", settings.font);
    localStorage.setItem("lumos-radius", settings.radius);
    localStorage.setItem("lumos-animation", settings.animation);
    localStorage.setItem("lumos-high-contrast", settings.highContrast.toString());
    localStorage.setItem("lumos-reduced-motion", settings.reducedMotion.toString());
    localStorage.setItem("lumos-custom-theme", settings.customTheme.toString());
    localStorage.setItem("lumos-custom-primary", settings.customPrimaryColor);
    localStorage.setItem("lumos-custom-accent", settings.customAccentColor);
  }
  
  // 保存并应用主题设置
  const saveSettings = () => {
    applyThemeSettings({
      colorTheme: selectedColorTheme,
      fontSize,
      font: selectedFont,
      radius: selectedRadius,
      animation: selectedAnimation,
      highContrast,
      reducedMotion,
      customTheme,
      customPrimaryColor,
      customAccentColor
    });
    
    toast({
      title: "主题设置已保存",
      description: "您的自定义主题设置已应用到界面",
    });
  }
  
  // 重置为默认设置
  const resetSettings = () => {
    setSelectedColorTheme("blue");
    setFontSize(16);
    setSelectedFont("sans");
    setSelectedRadius("md");
    setSelectedAnimation("normal");
    setHighContrast(false);
    setReducedMotion(false);
    setCustomTheme(false);
    setCustomPrimaryColor("#3b82f6");
    setCustomAccentColor("#60a5fa");
    
    applyThemeSettings({
      colorTheme: "blue",
      fontSize: 16,
      font: "sans",
      radius: "md",
      animation: "normal",
      highContrast: false,
      reducedMotion: false,
      customTheme: false,
      customPrimaryColor: "#3b82f6",
      customAccentColor: "#60a5fa"
    });
    
    toast({
      title: "设置已重置",
      description: "主题设置已恢复为默认值",
    });
  }
  
  // 避免在水合前渲染，防止不匹配
  if (!mounted) return null;
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">自定义主题</h1>
        <p className="text-muted-foreground mt-2">
          自定义界面外观和主题
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="appearance">
                <Palette className="mr-2 h-4 w-4" />
                外观设置
              </TabsTrigger>
              <TabsTrigger value="accessibility">
                <EyeIcon className="mr-2 h-4 w-4" />
                可访问性
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="mr-2 h-5 w-5" />
                    常规设置
                  </CardTitle>
                  <CardDescription>
                    基本主题和显示设置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>主题模式</Label>
                    <RadioGroup 
                      className="flex space-x-2"
                      defaultValue={theme}
                      onValueChange={setTheme}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                        <Label
                          htmlFor="theme-light"
                          className={`cursor-pointer rounded-md border-2 p-3 ${
                            theme === "light" ? "border-primary" : "border-transparent"
                          }`}
                        >
                          <Sun className="h-5 w-5" />
                        </Label>
                        <span className="text-xs">浅色</span>
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                        <Label
                          htmlFor="theme-dark"
                          className={`cursor-pointer rounded-md border-2 p-3 ${
                            theme === "dark" ? "border-primary" : "border-transparent"
                          }`}
                        >
                          <Moon className="h-5 w-5" />
                        </Label>
                        <span className="text-xs">深色</span>
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                        <Label
                          htmlFor="theme-system"
                          className={`cursor-pointer rounded-md border-2 p-3 ${
                            theme === "system" ? "border-primary" : "border-transparent"
                          }`}
                        >
                          <Monitor className="h-5 w-5" />
                        </Label>
                        <span className="text-xs">跟随系统</span>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>字体大小</Label>
                      <span className="text-sm">{fontSize}px</span>
                    </div>
                    <Slider
                      value={[fontSize]}
                      min={12}
                      max={24}
                      step={1}
                      onValueChange={(value) => setFontSize(value[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="font-family">字体风格</Label>
                    <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger id="font-family">
                        <SelectValue placeholder="选择字体" />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font.id} value={font.id}>{font.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="corner-radius">元素圆角</Label>
                    <Select value={selectedRadius} onValueChange={setSelectedRadius}>
                      <SelectTrigger id="corner-radius">
                        <SelectValue placeholder="选择圆角样式" />
                      </SelectTrigger>
                      <SelectContent>
                        {radiusOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="animation-style">动画效果</Label>
                    <Select value={selectedAnimation} onValueChange={setSelectedAnimation}>
                      <SelectTrigger id="animation-style">
                        <SelectValue placeholder="选择动画样式" />
                      </SelectTrigger>
                      <SelectContent>
                        {animationOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PaintBucket className="mr-2 h-5 w-5" />
                    颜色主题
                  </CardTitle>
                  <CardDescription>
                    选择预设主题或创建自定义主题
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="custom-theme"
                      checked={customTheme}
                      onCheckedChange={setCustomTheme}
                    />
                    <Label htmlFor="custom-theme">使用自定义颜色</Label>
                  </div>
                  
                  {!customTheme ? (
                    <div className="space-y-4">
                      <Label>预设主题</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {colorThemes.map((colorTheme) => (
                          <div 
                            key={colorTheme.id}
                            className={`flex flex-col items-center space-y-1 cursor-pointer`}
                            onClick={() => setSelectedColorTheme(colorTheme.id)}
                          >
                            <div 
                              className={`h-10 w-10 rounded-full relative`} 
                              style={{ backgroundColor: colorTheme.primary }}
                            >
                              {selectedColorTheme === colorTheme.id && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check className="h-6 w-6 text-white" />
                                </div>
                              )}
                              <div 
                                className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full border-2 border-background"
                                style={{ backgroundColor: colorTheme.secondary }}
                              />
                            </div>
                            <span className="text-xs">{colorTheme.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primary-color" className="flex items-center">
                            <div 
                              className="h-4 w-4 rounded mr-2" 
                              style={{ backgroundColor: customPrimaryColor }}
                            />
                            主要颜色
                          </Label>
                          <div className="flex gap-2">
                            <div 
                              className="h-9 w-9 rounded border flex items-center justify-center cursor-pointer"
                              style={{ backgroundColor: customPrimaryColor }}
                              onClick={() => document.getElementById('primary-color-input')?.click()}
                            >
                              <PaintBucket className="h-4 w-4 text-white" />
                            </div>
                            <input
                              id="primary-color-input"
                              type="color"
                              value={customPrimaryColor}
                              onChange={(e) => setCustomPrimaryColor(e.target.value)}
                              className="sr-only"
                            />
                            <input
                              id="primary-color"
                              type="text"
                              value={customPrimaryColor}
                              onChange={(e) => setCustomPrimaryColor(e.target.value)}
                              className="flex-1 h-9 px-3 rounded-md border bg-background"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="accent-color" className="flex items-center">
                            <div 
                              className="h-4 w-4 rounded mr-2" 
                              style={{ backgroundColor: customAccentColor }}
                            />
                            强调颜色
                          </Label>
                          <div className="flex gap-2">
                            <div 
                              className="h-9 w-9 rounded border flex items-center justify-center cursor-pointer"
                              style={{ backgroundColor: customAccentColor }}
                              onClick={() => document.getElementById('accent-color-input')?.click()}
                            >
                              <PaintBucket className="h-4 w-4 text-white" />
                            </div>
                            <input
                              id="accent-color-input"
                              type="color"
                              value={customAccentColor}
                              onChange={(e) => setCustomAccentColor(e.target.value)}
                              className="sr-only"
                            />
                            <input
                              id="accent-color"
                              type="text"
                              value={customAccentColor}
                              onChange={(e) => setCustomAccentColor(e.target.value)}
                              className="flex-1 h-9 px-3 rounded-md border bg-background"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col p-4 border rounded-md">
                        <Label className="mb-2">预览</Label>
                        <div className="flex gap-2 mt-2">
                          <Button style={{ backgroundColor: customPrimaryColor, color: "white" }}>
                            主要按钮
                          </Button>
                          <Button variant="outline" style={{ 
                            borderColor: customPrimaryColor, 
                            color: customPrimaryColor 
                          }}>
                            次要按钮
                          </Button>
                          <Button variant="ghost">
                            Ghost按钮
                          </Button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <div className="h-8 w-8 rounded-md" style={{ backgroundColor: customPrimaryColor }}></div>
                          <div className="h-8 w-8 rounded-md" style={{ backgroundColor: customAccentColor }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="accessibility" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <EyeIcon className="mr-2 h-5 w-5" />
                    可访问性设置
                  </CardTitle>
                  <CardDescription>
                    调整界面以提高可访问性和可用性
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="high-contrast">高对比度模式</Label>
                      <p className="text-sm text-muted-foreground">
                        增强文本和背景对比度，使内容更易阅读
                      </p>
                    </div>
                    <Switch
                      id="high-contrast"
                      checked={highContrast}
                      onCheckedChange={setHighContrast}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="reduced-motion">减少动画</Label>
                      <p className="text-sm text-muted-foreground">
                        减少或禁用界面动画效果
                      </p>
                    </div>
                    <Switch
                      id="reduced-motion"
                      checked={reducedMotion}
                      onCheckedChange={setReducedMotion}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="lg:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>预览</CardTitle>
              <CardDescription>
                您的主题设置效果预览
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-y relative">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground p-4">
                  <PanelLeftClose className="h-5 w-5 mr-2" />
                  <span>应用保存后查看完整效果</span>
                </div>
                <div className={`p-4 h-[300px] opacity-50`} style={{
                  fontFamily: fontOptions.find(f => f.id === selectedFont)?.value
                }}>
                  <div className="w-24 h-8 mb-3 rounded" style={{ backgroundColor: customTheme ? customPrimaryColor : colorThemes.find(t => t.id === selectedColorTheme)?.primary }}></div>
                  <div className="h-4 w-48 rounded-sm mb-1.5 bg-foreground/20"></div>
                  <div className="h-4 w-72 rounded-sm mb-1.5 bg-foreground/20"></div>
                  <div className="h-4 w-64 rounded-sm mb-4 bg-foreground/20"></div>
                  
                  <div className="flex gap-2 mb-4">
                    <div className="h-8 w-20 rounded" style={{ backgroundColor: customTheme ? customPrimaryColor : colorThemes.find(t => t.id === selectedColorTheme)?.primary }}></div>
                    <div className="h-8 w-20 rounded border border-foreground/20"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-12 rounded border border-foreground/20 p-3">
                      <div className="h-full w-24 bg-foreground/20 rounded-sm"></div>
                    </div>
                    <div className="h-12 rounded border border-foreground/20 p-3">
                      <div className="h-full w-32 bg-foreground/20 rounded-sm"></div>
                    </div>
                    <div className="h-12 rounded border border-foreground/20 p-3">
                      <div className="h-full w-16 bg-foreground/20 rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between mt-4">
              <Button variant="outline" onClick={resetSettings}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重置设置
              </Button>
              <Button onClick={saveSettings}>
                <Check className="mr-2 h-4 w-4" />
                保存设置
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>设置说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-semibold">主题模式：</span>
                <span className="text-muted-foreground">选择浅色、深色或跟随系统模式</span>
              </div>
              <div>
                <span className="font-semibold">颜色主题：</span>
                <span className="text-muted-foreground">更改界面主色调和强调色</span>
              </div>
              <div>
                <span className="font-semibold">字体和大小：</span>
                <span className="text-muted-foreground">调整文本字体和大小</span>
              </div>
              <div>
                <span className="font-semibold">元素圆角：</span>
                <span className="text-muted-foreground">设置界面元素圆角程度</span>
              </div>
              <div>
                <span className="font-semibold">动画效果：</span>
                <span className="text-muted-foreground">控制界面过渡动画的强度</span>
              </div>
              <div>
                <span className="font-semibold">可访问性设置：</span>
                <span className="text-muted-foreground">高对比度和减少动画模式</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 