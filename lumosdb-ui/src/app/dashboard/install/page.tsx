"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Chrome, 
  Download, 
  Globe, 
  Info as InfoIcon, 
  Laptop, 
  Smartphone 
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

// Browser detection
const getBrowser = () => {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'chrome'
  if (ua.includes('Firefox')) return 'firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari'
  if (ua.includes('Edge') || ua.includes('Edg')) return 'edge'
  return 'unknown'
}

// Platform detection
const getPlatform = () => {
  if (typeof window === 'undefined') return 'desktop'
  
  const ua = navigator.userAgent
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}

export default function InstallPage() {
  const [browser, setBrowser] = useState<string>('unknown')
  const [platform, setPlatform] = useState<string>('desktop')
  const [isInstallable, setIsInstallable] = useState<boolean>(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  
  useEffect(() => {
    setBrowser(getBrowser())
    setPlatform(getPlatform())
    
    // Check if the app is installable
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      setIsInstallable(true)
    })
    
    window.addEventListener('appinstalled', () => {
      // Hide the app-provided install promotion
      setIsInstallable(false)
      // Clear the deferredPrompt
      setDeferredPrompt(null)
    })
  }, [])
  
  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    // We no longer need the prompt
    setDeferredPrompt(null)
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">安装 LumosDB</h1>
        <p className="text-muted-foreground mt-2">在您的设备上安装 LumosDB 以获得更好的使用体验</p>
      </div>
      
      {isInstallable && (
        <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2">立即安装 LumosDB</h2>
                <p className="text-muted-foreground mb-4">
                  将 LumosDB 安装到您的设备上，方便随时访问。安装后，LumosDB 将作为独立应用运行，无需打开浏览器。
                </p>
                <Button onClick={handleInstall} className="gap-2">
                  <Download className="h-4 w-4" /> 
                  安装应用
                </Button>
              </div>
              <div className="md:w-1/3 flex justify-center">
                <div className="relative w-40 h-40">
                  <Image 
                    src="/icons/icon-192x192.svg" 
                    alt="LumosDB Logo" 
                    width={160}
                    height={160}
                    className="drop-shadow-md"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue={platform}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="desktop">
            <Laptop className="mr-2 h-4 w-4" /> 
            桌面安装指南
          </TabsTrigger>
          <TabsTrigger value="mobile">
            <Smartphone className="mr-2 h-4 w-4" /> 
            移动设备安装指南
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="desktop" className="mt-6 space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              在桌面浏览器中，PWA 应用通常可以通过浏览器的地址栏或菜单进行安装。
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chrome installation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  <CardTitle>Chrome</CardTitle>
                </div>
                <CardDescription>在 Chrome 浏览器中安装</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>点击浏览器地址栏右侧的安装图标（<Download className="inline h-4 w-4" />）</li>
                  <li>在弹出菜单中选择"安装 LumosDB"</li>
                  <li>在确认窗口中点击"安装"按钮</li>
                </ol>
              </CardContent>
              <CardFooter className={browser === 'chrome' ? "bg-primary/5" : ""}>
                {browser === 'chrome' && (
                  <div className="text-xs text-muted-foreground w-full text-center py-1">
                    当前浏览器适用
                  </div>
                )}
              </CardFooter>
            </Card>
            
            {/* Firefox installation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>Firefox</CardTitle>
                </div>
                <CardDescription>在 Firefox 浏览器中安装</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>点击浏览器地址栏右侧的菜单按钮</li>
                  <li>选择"安装应用"选项</li>
                  <li>在确认窗口中点击"安装"按钮</li>
                </ol>
              </CardContent>
              <CardFooter className={browser === 'firefox' ? "bg-primary/5" : ""}>
                {browser === 'firefox' && (
                  <div className="text-xs text-muted-foreground w-full text-center py-1">
                    当前浏览器适用
                  </div>
                )}
              </CardFooter>
            </Card>
            
            {/* Safari installation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>Safari</CardTitle>
                </div>
                <CardDescription>在 Safari 浏览器中安装</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>点击浏览器底部的分享按钮</li>
                  <li>向下滚动并选择"添加到主屏幕"</li>
                  <li>点击右上角的"添加"按钮确认</li>
                </ol>
              </CardContent>
              <CardFooter className={browser === 'safari' ? "bg-primary/5" : ""}>
                {browser === 'safari' && (
                  <div className="text-xs text-muted-foreground w-full text-center py-1">
                    当前浏览器适用
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="mobile" className="mt-6 space-y-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              在移动设备上，您可以通过浏览器的"添加到主屏幕"功能来安装 LumosDB。
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Android installation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  <CardTitle>Android 设备</CardTitle>
                </div>
                <CardDescription>在 Android 移动设备上安装</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>在 Chrome 中点击右上角的菜单按钮</li>
                  <li>选择"添加到主屏幕"</li>
                  <li>点击"添加"按钮确认</li>
                </ol>
                <Separator />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    注意：不同版本的 Android 设备和浏览器可能有所不同。如果没有看到"添加到主屏幕"选项，可能需要先点击"安装应用"。
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* iOS installation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>iOS 设备</CardTitle>
                </div>
                <CardDescription>在 iPhone 或 iPad 上安装</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>在 Safari 中点击底部的分享按钮</li>
                  <li>向下滚动并点击"添加到主屏幕"</li>
                  <li>点击右上角的"添加"按钮确认</li>
                </ol>
                <Separator />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    注意：iOS 仅支持 Safari 浏览器安装 PWA。如果您使用的是其他浏览器，请先切换到 Safari。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="bg-muted/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">安装后的功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-2">离线访问</h3>
            <p className="text-sm text-muted-foreground">
              安装后可在无网络环境下使用基本功能
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <Laptop className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-2">独立应用</h3>
            <p className="text-sm text-muted-foreground">
              作为独立应用运行，无需打开浏览器
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium mb-2">响应式设计</h3>
            <p className="text-sm text-muted-foreground">
              在不同设备上提供最佳使用体验
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 