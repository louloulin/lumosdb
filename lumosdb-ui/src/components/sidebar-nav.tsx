import { 
  LayoutDashboard, 
  Database, 
  Server, 
  Code, 
  LineChart, 
  Activity, 
  Settings, 
  UserCircle,
  Download 
} from "lucide-react"

export const sidebarNavItems = [
  {
    title: "仪表盘",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: "SQLite 管理",
    href: "/dashboard/sqlite",
    icon: <Database className="w-5 h-5" />,
  },
  {
    title: "SQL 编辑器",
    href: "/dashboard/sql-editor",
    icon: <Code className="w-5 h-5" />,
  },
  {
    title: "DuckDB 分析",
    href: "/dashboard/duckdb",
    icon: <Server className="w-5 h-5" />,
  },
  {
    title: "向量存储",
    href: "/dashboard/vectors",
    icon: <LineChart className="w-5 h-5" />,
  },
  {
    title: "实时数据",
    href: "/dashboard/realtime",
    icon: <Activity className="w-5 h-5" />,
  },
  {
    title: "安装应用",
    href: "/dashboard/install",
    icon: <Download className="w-5 h-5" />,
  },
  {
    title: "系统设置",
    href: "/dashboard/settings",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    title: "个人资料",
    href: "/dashboard/profile",
    icon: <UserCircle className="w-5 h-5" />,
  },
] 