"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, Download, Chrome, Safari, Firefox, Smartphone } from "lucide-react"

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [browser, setBrowser] = useState("")

  useEffect(() => {
    // Detect browser
    const ua = navigator.userAgent
    if (ua.indexOf("Chrome") > -1) {
      setBrowser("chrome")
    } else if (ua.indexOf("Safari") > -1) {
      setBrowser("safari")
    } else if (ua.indexOf("Firefox") > -1) {
      setBrowser("firefox")
    }

    // Detect platform
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    setIsAndroid(/Android/.test(ua))

    // Check if app is installable
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      setIsInstallable(true)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {})
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">安装 LumosDB 桌面应用</h1>
      
      {/* Main installation button for compatible browsers */}
      {isInstallable && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>一键安装</CardTitle>
            <CardDescription>
              您的浏览器支持直接安装 LumosDB 桌面应用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              安装 LumosDB 桌面应用后，您可以：
            </p>
            <ul className="list-disc pl-5 mb-4 space-y-2">
              <li>从桌面或开始菜单快速启动</li>
              <li>离线访问基本功能</li>
              <li>享受更快的加载速度</li>
              <li>获得原生应用般的体验</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="gap-2" onClick={handleInstallClick}>
              <Download className="h-4 w-4" />
              安装桌面应用
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Manual installation instructions by platform */}
      <Tabs defaultValue="chrome" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chrome" className="gap-2">
            <Chrome className="h-4 w-4" />
            Chrome
          </TabsTrigger>
          <TabsTrigger value="safari" className="gap-2">
            <Safari className="h-4 w-4" />
            Safari
          </TabsTrigger>
          <TabsTrigger value="firefox" className="gap-2">
            <Firefox className="h-4 w-4" />
            Firefox
          </TabsTrigger>
          <TabsTrigger value="mobile" className="gap-2">
            <Smartphone className="h-4 w-4" />
            移动设备
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chrome">
          <Card>
            <CardHeader>
              <CardTitle>在 Chrome 中安装</CardTitle>
              <CardDescription>
                通过 Chrome 浏览器安装 LumosDB 桌面应用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 space-y-4">
                <li>
                  在 Chrome 的地址栏右侧，点击安装图标
                  <div className="my-2 p-4 bg-muted rounded-md flex items-center gap-3">
                    <Download className="h-5 w-5" />
                    <span>若未看到此图标，请检查浏览器是否为最新版本</span>
                  </div>
                </li>
                <li>在弹出的对话框中点击"安装"</li>
                <li>完成后，LumosDB 将作为独立应用在您的系统中安装</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="safari">
          {isIOS ? (
            <Card>
              <CardHeader>
                <CardTitle>在 iOS Safari 中安装</CardTitle>
                <CardDescription>
                  通过 Safari 浏览器将 LumosDB 添加至主屏幕
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-4">
                  <li>在 Safari 中点击分享按钮</li>
                  <li>在菜单中选择"添加到主屏幕"</li>
                  <li>给应用起个名字（默认为 LumosDB）</li>
                  <li>点击"添加"完成安装</li>
                </ol>
                <div className="mt-4">
                  <Image
                    src="/screenshots/mobile.png"
                    alt="iOS 安装指南"
                    width={300}
                    height={533}
                    className="rounded-md border border-border mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>在 macOS Safari 中安装</CardTitle>
                <CardDescription>
                  在 macOS 上，Safari 目前不支持安装 PWA，请使用 Chrome 获得最佳体验
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>提示</AlertTitle>
                  <AlertDescription>
                    Safari 目前不支持完整的 PWA 安装。您可以继续使用网页版，或切换到 Chrome 获得桌面应用体验。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="firefox">
          <Card>
            <CardHeader>
              <CardTitle>在 Firefox 中安装</CardTitle>
              <CardDescription>
                Firefox 对 PWA 安装的支持有限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>提示</AlertTitle>
                <AlertDescription>
                  Firefox 目前对 PWA 安装支持有限。建议使用 Chrome 获得完整的桌面应用体验。
                </AlertDescription>
              </Alert>
              <p className="mt-4">或者，您可以：</p>
              <ol className="list-decimal pl-5 space-y-2 mt-2">
                <li>将此网页添加到收藏夹</li>
                <li>将网页固定到任务栏（在桌面设备上）</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="mobile">
          <Card>
            <CardHeader>
              <CardTitle>在移动设备上安装</CardTitle>
              <CardDescription>
                将 LumosDB 添加到手机主屏幕
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isIOS ? (
                <div>
                  <h3 className="text-lg font-medium mb-2">iOS 安装步骤</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>在 Safari 中点击分享按钮</li>
                    <li>在菜单中选择"添加到主屏幕"</li>
                    <li>给应用起个名字（默认为 LumosDB）</li>
                    <li>点击"添加"完成安装</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div>
                  <h3 className="text-lg font-medium mb-2">Android 安装步骤</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>在 Chrome 中点击菜单按钮（右上角三个点）</li>
                    <li>选择"安装应用"或"添加到主屏幕"</li>
                    <li>按照提示完成安装</li>
                  </ol>
                </div>
              ) : (
                <div>
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                      请使用 iOS 上的 Safari 或 Android 上的 Chrome 获得最佳安装体验。
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 