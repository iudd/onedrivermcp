// test-files.js - OneDrive文件操作测试脚本
const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3000';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMGI5ODdjNC0wMGRjLTQxYzktYTYzMS0zMWQ3Mjk0NWE3NTgiLCJtaWNyb3NvZnRBdXRoZW50aWNhdGVkIjp0cnVlLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjMzMDU4ODIsImV4cCI6MTc2MzMwNjc4Mn0.yWWUNavWl-cIxD0xW8GcULGYxE01VZ_5iTD9FS0XmHA';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('=== OneDrive文件操作测试 ===', 'cyan');

async function testFileOperations() {
  try {
    // 步骤1: 测试服务器状态
    log('\n步骤 1: 测试服务器状态...', 'blue');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    if (healthResponse.data.status === 'OK') {
      log('✓ 服务器运行正常', 'green');
    } else {
      log('✗ 服务器异常', 'red');
      return;
    }

    // 步骤2: 测试文件列表
    log('\n步骤 2: 测试文件列表功能...', 'blue');
    const listResponse = await axios.get(`${BASE_URL}/api/files`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      params: {
        path: '/',
        limit: 10
      }
    });
    
    if (listResponse.data.success) {
      log('✓ 文件列表获取成功', 'green');
      const files = listResponse.data.data.files;
      log(`找到 ${files.length} 个文件/文件夹:`, 'yellow');
      files.forEach((file, index) => {
        const type = file.folder ? '📁' : '📄';
        const size = file.size ? ` (${(file.size / 1024).toFixed(1)}KB)` : '';
        log(`  ${index + 1}. ${type} ${file.name}${size}`, 'yellow');
      });
    } else {
      log('✗ 文件列表获取失败', 'red');
    }

    // 步骤3: 测试搜索功能
    log('\n步骤 3: 测试文件搜索功能...', 'blue');
    const searchResponse = await axios.get(`${BASE_URL}/api/files/search`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      params: {
        query: 'test',
        limit: 5
      }
    });
    
    if (searchResponse.data.success) {
      log('✓ 文件搜索成功', 'green');
      const results = searchResponse.data.data.results;
      log(`搜索到 ${results.length} 个结果:`, 'yellow');
      results.forEach((result, index) => {
        log(`  ${index + 1}. ${result.name} - ${result.path}`, 'yellow');
      });
    } else {
      log('⚠ 搜索功能可能未实现', 'yellow');
    }

    // 步骤4: 测试创建文件夹
    log('\n步骤 4: 测试创建文件夹功能...', 'blue');
    const testFolderName = `test-folder-${Date.now()}`;
    const createFolderResponse = await axios.post(`${BASE_URL}/api/folders`, {
      name: testFolderName,
      parentPath: '/'
    }, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (createFolderResponse.data.success) {
      log('✓ 文件夹创建成功', 'green');
      log(`创建文件夹: ${testFolderName}`, 'yellow');
    } else {
      log('⚠ 文件夹创建功能可能未实现', 'yellow');
    }

    // 步骤5: 测试MCP工具列表
    log('\n步骤 5: 测试MCP工具可用性...', 'blue');
    const toolsResponse = await axios.get(`${BASE_URL}/mcp/tools`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });
    
    if (toolsResponse.data.success) {
      log('✓ MCP工具列表获取成功', 'green');
      const tools = toolsResponse.data.data.tools;
      log(`可用MCP工具 (${tools.length}个):`, 'yellow');
      tools.forEach(tool => {
        log(`  📌 ${tool.name}: ${tool.description}`, 'yellow');
      });
    } else {
      log('✗ MCP工具列表获取失败', 'red');
    }

    log('\n🎉 文件操作测试完成!', 'green');
    log('建议下一步测试具体的文件读写操作。', 'cyan');

  } catch (error) {
    log(`\n❌ 测试过程中出现错误: ${error.message}`, 'red');
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      if (error.response.status === 401) {
        log('认证失败，请检查令牌是否有效', 'red');
      }
    }
  }
}

// 执行测试
testFileOperations();
