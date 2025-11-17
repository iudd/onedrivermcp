import { OneDriveFile, OneDriveListFilesParams, OneDriveSearchParams } from '../types/mcp.js';
export declare class OneDriveService {
    private client;
    private userId;
    constructor(userId: string);
    private initializeClient;
    /**
     * 列出文件和文件夹
     */
    listFiles(params?: OneDriveListFilesParams): Promise<OneDriveFile[]>;
    /**
     * 读取文件内容
     */
    readFile(fileId: string, encoding?: 'utf-8' | 'base64', maxSize?: number): Promise<string>;
    /**
     * 写入文件
     */
    writeFile(path: string, content: string, overwrite?: boolean): Promise<OneDriveFile>;
    /**
     * 搜索文件
     */
    searchFiles(params: OneDriveSearchParams): Promise<OneDriveFile[]>;
    /**
     * 创建文件夹
     */
    createFolder(path: string, name: string): Promise<OneDriveFile>;
    /**
     * 删除文件或文件夹
     */
    deleteFile(fileId: string): Promise<void>;
    /**
     * 获取文件信息
     */
    getFileInfo(fileId: string): Promise<OneDriveFile>;
    /**
     * 分块上传大文件
     */
    uploadFileChunked(path: string, content: Buffer, chunkSize?: number): Promise<OneDriveFile>;
}
//# sourceMappingURL=onedriveService.d.ts.map