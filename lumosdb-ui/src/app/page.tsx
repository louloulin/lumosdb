import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            LumosDB
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl">
            AI Agent Data Platform - Unified database solution combining SQLite, DuckDB and vector storage
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="https://github.com/yourusername/lumos-db" target="_blank">
              View on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
