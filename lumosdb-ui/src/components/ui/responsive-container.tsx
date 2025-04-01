"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type Breakpoint = "mobile" | "tablet" | "desktop" | "wide"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode | ((breakpoint: Breakpoint) => React.ReactNode)
  mobileBreakpoint?: number
  tabletBreakpoint?: number
  desktopBreakpoint?: number
  mobileClassName?: string
  tabletClassName?: string
  desktopClassName?: string
  wideClassName?: string
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  (
    { 
      className,
      children, 
      mobileBreakpoint = 640, 
      tabletBreakpoint = 768, 
      desktopBreakpoint = 1024,
      mobileClassName = "",
      tabletClassName = "",
      desktopClassName = "",
      wideClassName = "",
      ...props 
    }, 
    ref
  ) => {
    const [currentBreakpoint, setCurrentBreakpoint] = React.useState<Breakpoint>("desktop")
    
    React.useEffect(() => {
      const updateBreakpoint = () => {
        const width = window.innerWidth
        
        if (width < mobileBreakpoint) {
          setCurrentBreakpoint("mobile")
        } else if (width < tabletBreakpoint) {
          setCurrentBreakpoint("tablet")
        } else if (width < desktopBreakpoint) {
          setCurrentBreakpoint("desktop")
        } else {
          setCurrentBreakpoint("wide")
        }
      }
      
      // Initialize
      updateBreakpoint()
      
      // Add resize listener
      window.addEventListener('resize', updateBreakpoint)
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', updateBreakpoint)
      }
    }, [mobileBreakpoint, tabletBreakpoint, desktopBreakpoint])
    
    const breakpointClassNames = {
      mobile: mobileClassName,
      tablet: tabletClassName,
      desktop: desktopClassName,
      wide: wideClassName,
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "responsive-container",
          breakpointClassNames[currentBreakpoint],
          className
        )}
        data-breakpoint={currentBreakpoint}
        {...props}
      >
        {typeof children === 'function' 
          ? children(currentBreakpoint)
          : children
        }
      </div>
    )
  }
)

ResponsiveContainer.displayName = "ResponsiveContainer"

// Specialized components
const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="md:hidden">
      {children}
    </div>
  )
}

const TabletOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="hidden md:block lg:hidden">
      {children}
    </div>
  )
}

const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="hidden lg:block">
      {children}
    </div>
  )
}

const Breakpoint: React.FC<{ 
  children: React.ReactNode | ((breakpoint: Breakpoint) => React.ReactNode),
  above?: Breakpoint,
  below?: Breakpoint,
  is?: Breakpoint | Breakpoint[],
}> = ({ 
  children, 
  above, 
  below, 
  is 
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = React.useState<Breakpoint | null>(null)
  
  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      
      if (width < 640) {
        setCurrentBreakpoint("mobile")
      } else if (width < 768) {
        setCurrentBreakpoint("tablet")
      } else if (width < 1024) {
        setCurrentBreakpoint("desktop")
      } else {
        setCurrentBreakpoint("wide")
      }
    }
    
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    
    return () => {
      window.removeEventListener('resize', updateBreakpoint)
    }
  }, [])
  
  if (!currentBreakpoint) return null
  
  const breakpointOrder: Record<Breakpoint, number> = {
    mobile: 0,
    tablet: 1,
    desktop: 2,
    wide: 3
  }
  
  let shouldRender = true
  
  if (above) {
    shouldRender = breakpointOrder[currentBreakpoint] > breakpointOrder[above]
  }
  
  if (below && shouldRender) {
    shouldRender = breakpointOrder[currentBreakpoint] < breakpointOrder[below]
  }
  
  if (is && shouldRender) {
    if (Array.isArray(is)) {
      shouldRender = is.includes(currentBreakpoint)
    } else {
      shouldRender = currentBreakpoint === is
    }
  }
  
  if (!shouldRender) return null
  
  return typeof children === 'function' 
    ? <>{children(currentBreakpoint)}</>
    : <>{children}</>
}

export { 
  ResponsiveContainer, 
  MobileOnly, 
  TabletOnly, 
  DesktopOnly,
  Breakpoint
} 