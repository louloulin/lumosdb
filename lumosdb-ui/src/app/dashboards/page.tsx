import { DashboardList } from '@/components/dashboard/DashboardList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '仪表盘 | LumosDB',
  description: '管理您的数据仪表盘和可视化',
};

export default function DashboardsPage() {
  return (
    <div className="container mx-auto py-8">
      <DashboardList />
    </div>
  );
} 