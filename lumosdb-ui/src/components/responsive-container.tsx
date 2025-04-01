"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  desktopBreakpoint?: number;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  onBreakpointChange?: (breakpoint: 'mobile' | 'tablet' | 'desktop') => void;
}

/**
 * A responsive container that applies different classes based on the screen size
 * and provides the current breakpoint to its children.
 */
export function ResponsiveContainer({
  children,
  mobileBreakpoint = 640,
  tabletBreakpoint = 1024,
  desktopBreakpoint = 1280,
  mobileClassName = '',
  tabletClassName = '',
  desktopClassName = '',
  onBreakpointChange,
  className,
  ...props
}: ResponsiveContainerProps) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    // Function to update breakpoint based on window width
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let newBreakpoint: 'mobile' | 'tablet' | 'desktop';
      
      if (width < mobileBreakpoint) {
        newBreakpoint = 'mobile';
      } else if (width < tabletBreakpoint) {
        newBreakpoint = 'tablet';
      } else {
        newBreakpoint = 'desktop';
      }
      
      if (newBreakpoint !== currentBreakpoint) {
        setCurrentBreakpoint(newBreakpoint);
        onBreakpointChange?.(newBreakpoint);
      }
    };
    
    // Initial update
    updateBreakpoint();
    
    // Listen for window resize events
    window.addEventListener('resize', updateBreakpoint);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, [currentBreakpoint, mobileBreakpoint, tabletBreakpoint, desktopBreakpoint, onBreakpointChange]);
  
  // Determine which class to apply based on the current breakpoint
  const responsiveClassName = 
    currentBreakpoint === 'mobile' ? mobileClassName :
    currentBreakpoint === 'tablet' ? tabletClassName :
    desktopClassName;
  
  return (
    <div 
      className={cn(className, responsiveClassName)} 
      data-breakpoint={currentBreakpoint}
      {...props}
    >
      {typeof children === 'function' 
        ? children(currentBreakpoint) 
        : children}
    </div>
  );
}

/**
 * A component that only renders its children on specific breakpoints
 */
export function Breakpoint({
  children,
  show = ['mobile', 'tablet', 'desktop'],
}: {
  children: React.ReactNode;
  show?: Array<'mobile' | 'tablet' | 'desktop'>;
}) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Function to update breakpoint based on window width
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setCurrentBreakpoint('mobile');
      } else if (width < 1024) {
        setCurrentBreakpoint('tablet');
      } else {
        setCurrentBreakpoint('desktop');
      }
    };
    
    // Initial update
    updateBreakpoint();
    
    // Listen for window resize events
    window.addEventListener('resize', updateBreakpoint);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, []);
  
  // Don't render anything during SSR to avoid hydration mismatches
  if (!isMounted) {
    return null;
  }
  
  // Only render if the current breakpoint is in the show array
  if (!show.includes(currentBreakpoint)) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * A mobile-only component that only renders on mobile screens
 */
export function MobileOnly({ children }: { children: React.ReactNode }) {
  return <Breakpoint show={['mobile']}>{children}</Breakpoint>;
}

/**
 * A tablet-only component that only renders on tablet screens
 */
export function TabletOnly({ children }: { children: React.ReactNode }) {
  return <Breakpoint show={['tablet']}>{children}</Breakpoint>;
}

/**
 * A desktop-only component that only renders on desktop screens
 */
export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <Breakpoint show={['desktop']}>{children}</Breakpoint>;
}

/**
 * A component that renders on mobile and tablet screens
 */
export function MobileAndTablet({ children }: { children: React.ReactNode }) {
  return <Breakpoint show={['mobile', 'tablet']}>{children}</Breakpoint>;
}

/**
 * A component that renders on tablet and desktop screens
 */
export function TabletAndDesktop({ children }: { children: React.ReactNode }) {
  return <Breakpoint show={['tablet', 'desktop']}>{children}</Breakpoint>;
} 