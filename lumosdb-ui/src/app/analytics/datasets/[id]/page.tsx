import { Metadata } from "next";
import { DuckDBDatasetDetail } from "@/components/duckdb/DuckDBDatasetDetail";

export const metadata: Metadata = {
  title: "数据集详情 | LumosDB Analytics",
  description: "查看数据集详情和数据样本",
};

interface DatasetDetailPageProps {
  params: {
    id: string;
  };
}

export default function DatasetDetailPage({ params }: DatasetDetailPageProps) {
  return (
    <div className="container mx-auto py-8">
      <DuckDBDatasetDetail datasetId={params.id} />
    </div>
  );
} 