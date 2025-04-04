import React from "react";
import { AlertTriangle, Database, ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TableNotFoundProps {
  tableName: string;
  errorMessage?: string;
  onDiagnose?: () => void;
}

export default function TableNotFound({ tableName, errorMessage, onDiagnose }: TableNotFoundProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-md mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium mb-1">
            表 &quot;{tableName}&quot; 无法访问
          </p>
          {errorMessage && (
            <p className="text-sm mb-2">{errorMessage}</p>
          )}
          <p className="text-sm text-red-700 dark:text-red-400 mb-2">
            可能的原因:
          </p>
          <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 mb-3">
            <li>表已被删除或重命名</li>
            <li>您没有访问此表的权限</li>
            <li>数据库连接中断</li>
            <li>表名包含需要转义的特殊字符</li>
          </ul>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/sqlite">
                <ArrowLeft className="mr-2 h-4 w-4" />
                查看所有表
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/sqlite/tables/create">
                <Database className="mr-2 h-4 w-4" />
                创建新表
              </Link>
            </Button>
            {onDiagnose && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onDiagnose}
                className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:text-amber-900"
              >
                <Wrench className="mr-2 h-4 w-4" />
                诊断问题
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 