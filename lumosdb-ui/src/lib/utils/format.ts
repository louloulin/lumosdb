/**
 * 格式化文件大小为用户友好的字符串
 * 
 * @param bytes 文件大小（字节）
 * @param decimals 小数位数，默认为2
 * @returns 格式化后的文件大小字符串
 * 
 * @example
 * formatFileSize(1024); // 返回 "1 KB"
 * formatFileSize(1234567); // 返回 "1.18 MB"
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化数字为带千位分隔符的字符串
 * 
 * @param num 要格式化的数字
 * @returns 带千位分隔符的字符串
 * 
 * @example
 * formatNumber(1000); // 返回 "1,000"
 * formatNumber(1234567.89); // 返回 "1,234,567.89"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * 
 * @param date 日期对象或时间戳
 * @returns 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date(2023, 0, 15)); // 返回 "2023-01-15"
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间为 YYYY-MM-DD HH:MM:SS 格式
 * 
 * @param date 日期对象或时间戳
 * @returns 格式化后的日期时间字符串
 * 
 * @example
 * formatDateTime(new Date(2023, 0, 15, 14, 30, 45)); // 返回 "2023-01-15 14:30:45"
 */
export function formatDateTime(date: Date | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化持续时间（毫秒）为友好的字符串
 * 
 * @param milliseconds 持续时间（毫秒）
 * @returns 格式化后的持续时间字符串
 * 
 * @example
 * formatDuration(1500); // 返回 "1.5 秒"
 * formatDuration(65000); // 返回 "1 分 5 秒"
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds} 毫秒`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${(milliseconds / 1000).toFixed(1)} 秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes} 分 ${remainingSeconds} 秒`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours} 时 ${remainingMinutes} 分 ${remainingSeconds} 秒`;
} 