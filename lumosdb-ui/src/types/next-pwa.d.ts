declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  type PWAConfig = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    scope?: string;
    sw?: string;
    cacheOnFrontEndNav?: boolean;
    reloadOnOnline?: boolean;
    publicExcludes?: string[];
    buildExcludes?: Array<string | RegExp>;
    fallbacks?: { [key: string]: string };
    dynamicStartUrl?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp | string;
      handler: string;
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        networkTimeoutSeconds?: number;
        cacheableResponse?: {
          statuses: number[];
          headers: { [key: string]: string };
        };
      };
    }>;
  };
  
  export default function withPWA(config: NextConfig & { pwa: PWAConfig }): NextConfig;
} 