/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ["@mastra/*"],
    // ... your other Next.js config
  }
   
  module.exports = nextConfig
  Server Actions Example
  app/actions.ts
  
  'use server'
   
  import { mastra } from '@/mastra'
   
  export async function getWeatherInfo(city: string) {
    const agent = mastra.getAgent('weatherAgent')
    
    const result = await agent.generate(`What's the weather like in ${city}?`)
   
    return result
  }
  Use it in your component:
  
  app/components/Weather.tsx
  
  'use client'
   
  import { getWeatherInfo } from '../actions'
   
  export function Weather() {
    async function handleSubmit(formData: FormData) {
      const city = formData.get('city') as string
      const result = await getWeatherInfo(city)
      // Handle the result
      console.log(result)
    }
   
    return (
      <form action={handleSubmit}>
        <input name="city" placeholder="Enter city name" />
        <button type="submit">Get Weather</button>
      </form>
    )
  }
  API Routes Example
  app/api/chat/route.ts
  
  import { mastra } from '@/mastra'
  import { NextResponse } from 'next/server'
   
  export async function POST(req: Request) {
    const { city } = await req.json()
    const agent = mastra.getAgent('weatherAgent')
   
    const result = await agent.stream(`What's the weather like in ${city}?`)
   
    return result.toDataStreamResponse()
  }
  Deployment
  When using direct integration, your Mastra instance will be deployed alongside your Next.js application. Ensure you:
  
  Set up environment variables for your LLM API keys in your deployment platform
  Implement proper error handling for production use
  Monitor your AI agent’s performance and costs
  Observability
  Mastra provides built-in observability features to help you monitor, debug, and optimize your AI operations. This includes:
  
  Tracing of AI operations and their performance
  Logging of prompts, completions, and errors
  Integration with observability platforms like Langfuse and LangSmith
  For detailed setup instructions and configuration options specific to Next.js local development, see our Next.js Observability Configuration Guide.
  
  AI SDK
  Overview
  