# LumosDB UI

A modern, responsive web interface for LumosDB - the AI Agent Data Platform. This UI is inspired by Supabase and PocketBase, providing an intuitive interface for managing your database operations.

## Features

- **Dashboard Overview**: Monitor key statistics and recent activity
- **SQLite Tables**: Manage your transaction-based data tables
- **DuckDB Analytics**: Access analytical data optimized for OLAP
- **Vector Collections**: Work with AI embeddings and vector search
- **Modern UI**: Built with Next.js and shadcn/ui components
- **Dark/Light Mode**: Toggle between light and dark theme

## Tech Stack

- **Frontend Framework**: Next.js 14+
- **UI Components**: shadcn/ui (Tailwind CSS + Radix UI)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State Management**: React Query

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or pnpm
- LumosDB server running locally or remotely

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lumos-db.git
   cd lumos-db/lumosdb-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Configure the environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` to point to your LumosDB API endpoint.

4. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
lumosdb-ui/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── dashboard/        # Dashboard pages
│   │   │   ├── sqlite/       # SQLite tables management
│   │   │   ├── duckdb/       # DuckDB analytics
│   │   │   ├── vectors/      # Vector collections
│   │   │   └── settings/     # User settings
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable components
│   │   ├── ui/               # UI components from shadcn
│   │   └── theme-provider.tsx # Theme provider
│   ├── lib/                  # Utility functions
│   └── styles/               # Global styles
├── public/                   # Static assets
├── .env.example              # Example environment variables
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## Connecting to the LumosDB API

The UI connects to your LumosDB server via the API endpoints. Make sure the server is running and the API is accessible. The default endpoint is `http://localhost:8000/api`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
