import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, Database, LineChart } from "lucide-react";

export default function AIAssistantPage() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (type: "query" | "analysis") => {
    setLoading(true);
    try {
      // TODO: 实现与后端AI服务的集成
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "AI助手已生成结果",
        description: "已为您生成相关内容，请在下方查看。",
      });
    } catch (error) {
      toast({
        title: "生成失败",
        description: "请稍后重试或联系管理员。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">AI 智能助手</h1>
      
      <Tabs defaultValue="query" className="space-y-4">
        <TabsList>
          <TabsTrigger value="query">智能查询生成</TabsTrigger>
          <TabsTrigger value="analysis">数据分析建议</TabsTrigger>
        </TabsList>

        <TabsContent value="query">
          <Card>
            <CardHeader>
              <CardTitle>SQL查询生成器</CardTitle>
              <CardDescription>
                使用自然语言描述您的需求，AI将帮您生成对应的SQL查询语句
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="例如：查找最近30天内购买金额超过1000元的用户信息"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={() => handleSubmit("query")}
                disabled={loading || !input}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成SQL查询
                  </>
                )}
              </Button>
              <Card className="mt-4 bg-muted">
                <CardHeader>
                  <CardTitle className="text-sm">生成的SQL查询</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 rounded-lg bg-background">
                    <code>
                      {`SELECT u.user_id, u.username, SUM(o.amount) as total_amount
FROM users u
JOIN orders o ON u.user_id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_id, u.username
HAVING total_amount > 1000
ORDER BY total_amount DESC;`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>智能分析助手</CardTitle>
              <CardDescription>
                描述您的数据分析需求，AI将为您提供分析建议和可视化方案
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="例如：分析近半年的销售趋势和客户购买行为"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={() => handleSubmit("analysis")}
                disabled={loading || !input}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <LineChart className="mr-2 h-4 w-4" />
                    生成分析报告
                  </>
                )}
              </Button>
              <div className="grid gap-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">销售趋势分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] bg-muted rounded-lg flex items-center justify-center">
                      图表占位区域
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      建议使用时间序列分析，关注：
                      - 月度销售额变化趋势
                      - 季节性波动模式
                      - 同比环比增长率
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">客户行为洞察</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] bg-muted rounded-lg flex items-center justify-center">
                      图表占位区域
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      建议进行以下分析：
                      - RFM客户分层
                      - 购买频率分布
                      - 客单价分布
                      - 产品关联性分析
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 