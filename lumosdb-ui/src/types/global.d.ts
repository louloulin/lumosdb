// 全局类型声明文件
// 用于处理没有自带类型定义的第三方库

// framer-motion类型声明
declare module 'framer-motion' {
  export interface AnimationProps {
    initial?: any;
    animate?: any;
    exit?: any;
    variants?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
    whileFocus?: any;
    whileDrag?: any;
    whileInView?: any;
  }

  export interface MotionProps extends AnimationProps {
    style?: React.CSSProperties;
    className?: string;
    [key: string]: any;
  }

  export const motion: {
    [key: string]: React.ForwardRefExoticComponent<MotionProps>;
  };

  export const AnimatePresence: React.FC<{
    children?: React.ReactNode;
    mode?: 'sync' | 'wait' | 'popLayout';
    initial?: boolean;
    onExitComplete?: () => void;
  }>;
}

// 为其他缺少类型定义的库添加空声明
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// 声明全局环境变量
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_API_URL: string;
    // 添加其他环境变量
  }
} 