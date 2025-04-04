import React from "react";
import { AlertTriangle, Database, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TableNotFoundProps {
  tableName: string;
  errorMessage?: string;
}

export default function TableNotFound({ tableName, errorMessage }: TableNotFoundProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-md mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium mb-1">
            Table "{tableName}" could not be accessed
          </p>
          {errorMessage && (
            <p className="text-sm mb-2">{errorMessage}</p>
          )}
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">
            This may be due to:
          </p>
          <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 mb-3">
            <li>The table has been deleted or renamed</li>
            <li>You don't have permission to access this table</li>
            <li>The database connection is interrupted</li>
            <li>The table name contains special characters that need to be escaped</li>
          </ul>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/sqlite">
                <ArrowLeft className="mr-2 h-4 w-4" />
                View All Tables
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/sqlite/tables/create">
                <Database className="mr-2 h-4 w-4" />
                Create New Table
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 