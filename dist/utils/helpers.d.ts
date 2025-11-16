/**
 * 生成唯一的调用ID
 */
export declare function generateCallId(): string;
/**
 * 格式化文件大小
 */
export declare function formatFileSize(bytes: number): string;
/**
 * 验证文件路径
 */
export declare function validateFilePath(path: string): boolean;
/**
 * 延迟函数
 */
export declare function delay(ms: number): Promise<void>;
/**
 * 重试函数
 */
export declare function retry<T>(fn: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>;
/**
 * 生成随机字符串
 */
export declare function generateRandomString(length?: number): string;
/**
 * 检查是否为有效URL
 */
export declare function isValidUrl(string: string): boolean;
/**
 * 深度克隆对象
 */
export declare function deepClone<T>(obj: T): T;
//# sourceMappingURL=helpers.d.ts.map