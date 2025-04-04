import { Metadata } from "next";
import { CreateDuckDBDatasetForm } from "@/components/duckdb/CreateDuckDBDatasetForm";

export const metadata: Metadata = {
  title: "创建数据集 | LumosDB Analytics",
  description: "创建新的DuckDB数据集",
};

export default function NewDatasetPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">创建新数据集</h1>
      <CreateDuckDBDatasetForm />
    </div>
  );
} 