"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ImportExportRedirectPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new data-transfer page
    router.replace("/dashboard/data-transfer")
  }, [router])
  
  return (
    <div className="container py-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Data Transfer...</h1>
        <p className="text-muted-foreground">Please wait, you are being redirected to the new Data Transfer page.</p>
      </div>
    </div>
  )
} 