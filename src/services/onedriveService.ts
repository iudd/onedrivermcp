import { Client } from '@microsoft/microsoft-graph-client';
import { OneDriveFile, OneDriveListFilesParams, OneDriveSearchParams } from '../types/mcp.js';
import { logger } from '../utils/logger.js';
import { getTokenService, MockTokenService } from './tokenService';

export class OneDriveService {
  private client: Client | null = null;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // 初始化Graph客户端
  private async initializeClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const tokenService = isDevelopment ? new MockTokenService() : getTokenService();

    this.client = await tokenService.createGraphClient(this.userId);
    return this.client;
  }

  /**
   * 列出文件和文件夹
   */
  async listFiles(params: OneDriveListFilesParams = {}): Promise<OneDriveFile[]> {
    try {
      await this.initializeClient();
      const { path = '/', recursive = false, limit = 100, skip = 0 } = params;
      
      let endpoint = `/me/drive/root${path === '/' ? '' : `:${path}:`}/children`;
      endpoint += `?$top=${limit}&$skip=${skip}&$select=id,name,size,lastModifiedDateTime,webUrl,file,folder`;
      
      const response = await this.client!.api(endpoint).get();
      
      if (recursive && response.value) {
        const files: OneDriveFile[] = [];
        
        for (const item of response.value) {
          files.push(item);
          
          if (item.folder && item.folder.childCount > 0) {
            const subFiles = await this.listFiles({
              path: `${path === '/' ? '' : path}/${item.name}`,
              recursive: true,
              limit,
              skip: 0
            });
            files.push(...subFiles);
          }
        }
        
        return files.slice(0, limit);
      }
      
      return response.value || [];
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * 读取文件内容
   */
  async readFile(fileId: string, encoding: 'utf-8' | 'base64' = 'utf-8', maxSize = 1024 * 1024): Promise<string> {
    try {
      await this.initializeClient();
      // 先获取文件信息
      const fileInfo = await this.client!.api(`/me/drive/items/${fileId}`).get();
      
      if (fileInfo.size > maxSize) {
        throw new Error(`File too large: ${fileInfo.size} bytes (max: ${maxSize} bytes)`);
      }
      
      // 下载文件内容
      const content = await this.client!.api(`/me/drive/items/${fileId}/content`).get();
      
      if (encoding === 'base64') {
        return Buffer.from(content).toString('base64');
      }
      
      return content.toString('utf-8');
    } catch (error) {
      logger.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * 写入文件
   */
  async writeFile(path: string, content: string, overwrite = false): Promise<OneDriveFile> {
    try {
      await this.initializeClient();
      const endpoint = `/me/drive/root:${path}:/content`;
      
      if (!overwrite) {
        // 检查文件是否存在
        try {
          await this.client!.api(endpoint).get();
          throw new Error(`File already exists: ${path}`);
        } catch (error: any) {
          // 文件不存在，继续创建
          if (error.statusCode !== 404) throw error;
        }
      }
      
      const result = await this.client!.api(endpoint).put(content);
      return result;
    } catch (error) {
      logger.error('Error writing file:', error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * 搜索文件
   */
  async searchFiles(params: OneDriveSearchParams): Promise<OneDriveFile[]> {
    try {
      await this.initializeClient();
      const { query, path, fileType = 'all', maxResults = 50 } = params;
      
      let searchPath = '/me/drive/root';
      if (path && path !== '/') {
        searchPath += `:${path}:`;
      }
      
      let endpoint = `${searchPath}/search(q='${encodeURIComponent(query)}')`;
      endpoint += `?$top=${maxResults}&$select=id,name,size,lastModifiedDateTime,webUrl,file,folder`;
      
      const response = await this.client!.api(endpoint).get();
      
      let files = response.value || [];
      
      // 过滤文件类型
      if (fileType !== 'all') {
        files = files.filter(file => 
          fileType === 'file' ? file.file : file.folder
        );
      }
      
      return files;
    } catch (error) {
      logger.error('Error searching files:', error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(path: string, name: string): Promise<OneDriveFile> {
    try {
      await this.initializeClient();
      const endpoint = `/me/drive/root${path === '/' ? '' : `:${path}:`}/children`;
      
      const result = await this.client!.api(endpoint).post({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      });
      
      return result;
    } catch (error) {
      logger.error('Error creating folder:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * 删除文件或文件夹
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.initializeClient();
      await this.client!.api(`/me/drive/items/${fileId}`).delete();
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId: string): Promise<OneDriveFile> {
    try {
      await this.initializeClient();
      const result = await this.client!.api(`/me/drive/items/${fileId}`)
        .select('id,name,size,lastModifiedDateTime,webUrl,file,folder')
        .get();
      
      return result;
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * 分块上传大文件
   */
  async uploadFileChunked(path: string, content: Buffer, chunkSize = 5 * 1024 * 1024): Promise<OneDriveFile> {
    try {
      await this.initializeClient();
      const totalSize = content.length;
      const uploadSession = await this.client!.api(`/me/drive/root:${path}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
            name: path.split('/').pop()
          }
        });

      const uploadUrl = uploadSession.uploadUrl;
      
      for (let i = 0; i < totalSize; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        const rangeStart = i;
        const rangeEnd = Math.min(i + chunkSize - 1, totalSize - 1);
        
        const requestOptions = {
          headers: {
            'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
            'Content-Length': chunk.length.toString()
          }
        };
        
        await this.client!.api(uploadUrl)
          .headers({
            'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
            'Content-Length': chunk.length.toString()
          })
          .put(chunk);
      }

      return await this.getFileInfo(uploadSession.id);
    } catch (error) {
      logger.error('Error uploading file chunked:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}