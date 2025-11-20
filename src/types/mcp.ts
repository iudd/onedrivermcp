// MCP Protocol Types based on 2024-11-05 specification

export interface MCPInitRequest {
  protocolVersion: string;
  capabilities?: {
    roots?: boolean;
    sampling?: boolean;
  };
}

export interface MCPInitResponse {
  protocolVersion: string;
  capabilities: {
    roots: boolean;
    sampling: boolean;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  callId: string;
  tool: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  callId: string;
  content: Array<{
    type: 'text' | 'image' | 'resource';
    [key: string]: any;
  }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  mimeType?: string;
  name?: string;
  description?: string;
}

export interface MCPListResourcesRequest {
  toolCallId?: string;
}

export interface MCPReadResourceRequest {
  uri: string;
  mimeType?: string;
}

export interface MCPReadResourceResponse {
  contents: string;
  mimeType?: string;
}

// SSE Event Types
export interface SSEClientEvent {
  type: 'initialize' | 'tools_call' | 'resources_list' | 'resources_read';
  callId: string;
  data?: any;
}

export interface SSEServerEvent {
  type: 'initialized' | 'tool_result' | 'resource_content' | 'progress' | 'error';
  callId: string;
  data: any;
}

// OneDrive Specific Types
export interface OneDriveFile {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime: string;
  webUrl: string;
  file?: {
    mimeType: string;
    hashes?: {
      sha1Hash: string;
    };
  };
  folder?: {
    childCount: number;
  };
}

export interface OneDriveListFilesParams {
  path?: string;
  recursive?: boolean;
  limit?: number;
}

export interface OneDriveSearchParams {
  query: string;
  path?: string;
  fileType?: 'file' | 'folder' | 'all';
  maxResults?: number;
}

export interface FileUploadProgress {
  fileId: string;
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'completed' | 'failed';
}