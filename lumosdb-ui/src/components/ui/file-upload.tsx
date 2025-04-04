import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileIcon, UploadIcon, X } from 'lucide-react';

interface FileUploadProps {
  value: string;
  onChange: (value: string) => void;
  accept?: string;
  maxSize?: number; // 默认单位为MB
}

export function FileUpload({
  value,
  onChange,
  accept = '*',
  maxSize = 10 // 默认最大10MB
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当value从外部变化时更新文件名
  useEffect(() => {
    if (value) {
      const parts = value.split('/');
      const nameWithTimestamp = parts[parts.length - 1];
      // 去除时间戳前缀 (如果存在)
      const match = nameWithTimestamp.match(/^\d+_(.+)$/);
      const name = match ? match[1] : nameWithTimestamp;
      setFileName(name);
    } else {
      setFileName('');
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`文件大小不能超过 ${maxSize}MB`);
      return;
    }

    // 在真实环境中，这里应该上传文件到服务器并获取文件路径
    // 这里我们简单模拟一下，实际应用中应该使用真实的上传逻辑
    setFileName(file.name);
    setError(null);

    // 模拟文件路径，实际应用中应该获取真实的服务器路径
    const filePath = `/uploads/${Date.now()}_${file.name}`;
    onChange(filePath);
  };

  const handleClear = () => {
    setFileName('');
    setError(null);
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          id="file-upload"
        />
        <div className="flex-1 flex items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="mr-2"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            选择文件
          </Button>
          {fileName ? (
            <div className="flex items-center bg-gray-100 rounded px-3 py-2 flex-1">
              <FileIcon className="w-4 h-4 mr-2 text-blue-500" />
              <span className="text-sm truncate">{fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="ml-auto p-1"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span className="text-sm text-gray-500">
              {error || '尚未选择文件'}
            </span>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
} 