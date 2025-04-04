import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadingApi } from '@/hooks/useLoadingApi';
import { createDuckDBDataset } from '@/lib/api/duckdb-service';
import { toast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FileUpload } from '../ui/file-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 如果缺少这些库，需要安装:
// npm install react-hook-form zod @hookform/resolvers

const baseFormSchema = z.object({
  name: z.string().min(2, { message: '名称至少需要2个字符' }).max(100),
  description: z.string().max(500).optional(),
});

const csvFormSchema = baseFormSchema.extend({
  source: z.literal('csv'),
  delimiter: z.string().min(1).max(5).default(','),
  hasHeader: z.boolean().default(true),
  filePath: z.string().min(1, { message: '请选择CSV文件' }),
});

const jsonFormSchema = baseFormSchema.extend({
  source: z.literal('json'),
  filePath: z.string().min(1, { message: '请选择JSON文件' }),
});

const parquetFormSchema = baseFormSchema.extend({
  source: z.literal('parquet'),
  filePath: z.string().min(1, { message: '请选择Parquet文件' }),
});

const sqlFormSchema = baseFormSchema.extend({
  source: z.literal('query'),
  query: z.string().min(5, { message: 'SQL查询至少需要5个字符' }),
});

type FileFormSchema = z.infer<typeof csvFormSchema> | z.infer<typeof jsonFormSchema> | z.infer<typeof parquetFormSchema>;
type SqlFormSchema = z.infer<typeof sqlFormSchema>;
type FormSchema = FileFormSchema | SqlFormSchema;

export function CreateDuckDBDatasetForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'file' | 'sql'>('file');
  const [fileType, setFileType] = useState<'csv' | 'json' | 'parquet'>('csv');

  const fileForm = useForm<FileFormSchema>({
    resolver: zodResolver(
      fileType === 'csv' 
        ? csvFormSchema 
        : fileType === 'json' 
          ? jsonFormSchema 
          : parquetFormSchema
    ),
    defaultValues: {
      name: '',
      description: '',
      source: 'csv' as const,
      ...(fileType === 'csv' && { 
        delimiter: ',',
        hasHeader: true,
      }),
    },
  });

  const sqlForm = useForm<SqlFormSchema>({
    resolver: zodResolver(sqlFormSchema),
    defaultValues: {
      name: '',
      description: '',
      source: 'query' as const,
      query: '',
    },
  });

  const { execute: createDataset, loading } = useLoadingApi(async (data: FormSchema) => {
    try {
      // 构建创建数据集的请求数据
      const createOptions = {
        name: data.name,
        description: data.description,
        source: data.source,
        sourceOptions: 
          data.source === 'csv' 
            ? {
                path: data.filePath,
                delimiter: data.delimiter,
                hasHeader: data.hasHeader,
              }
            : data.source === 'json' || data.source === 'parquet'
              ? {
                  path: data.filePath,
                }
              : {
                  query: data.query,
                },
      };

      // 创建数据集
      const dataset = await createDuckDBDataset(createOptions);

      // 显示成功消息
      toast({
        title: '创建成功',
        description: `数据集 "${dataset.name}" 已成功创建`,
      });

      // 导航到数据集列表页
      router.push('/analytics/datasets');
      
      return dataset;
    } catch (error) {
      // 显示错误消息
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '无法创建数据集',
        variant: 'destructive',
      });
      throw error;
    }
  });

  const onFileFormSubmit = (data: FileFormSchema) => {
    createDataset(data);
  };

  const onSqlFormSubmit = (data: SqlFormSchema) => {
    createDataset(data);
  };

  const handleFileTypeChange = (value: string) => {
    setFileType(value as 'csv' | 'json' | 'parquet');
    // 重置表单以应用新的验证规则
    fileForm.reset({
      name: fileForm.getValues('name'),
      description: fileForm.getValues('description'),
      source: value as 'csv' | 'json' | 'parquet',
      ...(value === 'csv' && { 
        delimiter: ',',
        hasHeader: true,
      }),
    });
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>创建新数据集</CardTitle>
        <CardDescription>
          创建一个新的DuckDB数据集，您可以从文件导入或使用SQL查询创建
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'file' | 'sql')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">从文件导入</TabsTrigger>
            <TabsTrigger value="sql">从SQL查询创建</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file">
            <Form {...fileForm}>
              <form onSubmit={fileForm.handleSubmit(onFileFormSubmit)} className="space-y-6">
                <FormField
                  control={fileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据集名称</FormLabel>
                      <FormControl>
                        <Input placeholder="输入数据集名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={fileForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>描述 (可选)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="输入数据集描述" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>文件类型</FormLabel>
                    <Select
                      value={fileType}
                      onValueChange={handleFileTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择文件类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV文件</SelectItem>
                        <SelectItem value="json">JSON文件</SelectItem>
                        <SelectItem value="parquet">Parquet文件</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  
                  {fileType === 'csv' && (
                    <FormField
                      control={fileForm.control}
                      name="delimiter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>分隔符</FormLabel>
                          <FormControl>
                            <Input placeholder="," {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {fileType === 'csv' && (
                  <FormField
                    control={fileForm.control}
                    name="hasHeader"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel>文件包含标题行</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={fileForm.control}
                  name="filePath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择文件</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={field.value}
                          onChange={field.onChange}
                          accept={
                            fileType === 'csv' 
                              ? '.csv' 
                              : fileType === 'json' 
                                ? '.json' 
                                : '.parquet'
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/analytics/datasets')}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? '创建中...' : '创建数据集'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="sql">
            <Form {...sqlForm}>
              <form onSubmit={sqlForm.handleSubmit(onSqlFormSubmit)} className="space-y-6">
                <FormField
                  control={sqlForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据集名称</FormLabel>
                      <FormControl>
                        <Input placeholder="输入数据集名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sqlForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>描述 (可选)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="输入数据集描述" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sqlForm.control}
                  name="query"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SQL查询</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="输入SQL查询语句" 
                          {...field} 
                          rows={10}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/analytics/datasets')}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? '创建中...' : '创建数据集'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 