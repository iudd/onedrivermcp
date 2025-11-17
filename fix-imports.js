// 修复ES模块导入路径的脚本
const fs = require('fs');
const path = require('path');

// 修复导入路径
function fixImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 修复相对路径导入，添加.js扩展名
        content = content.replace(
            /import\s+(?:{[^}]+}\s+from\s+)?['"]\.\/([^'"]+)['"]/g, 
            (match, importPath) => {
                if (!importPath.endsWith('.js')) {
                    return match.replace(`./${importPath}`, `./${importPath}.js`);
                }
                return match;
            }
        );
        
        // 修复父目录的相对路径导入
        content = content.replace(
            /import\s+(?:{[^}]+}\s+from\s+)?['"]\.\.\/([^'"]+)['"]/g, 
            (match, importPath) => {
                if (!importPath.endsWith('.js')) {
                    return match.replace(`../${importPath}`, `../${importPath}.js`);
                }
                return match;
            }
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed imports in: ${filePath}`);
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
    }
}

// 修复关键文件
const filesToFix = [
    'dist/services/onedriveService.js',
    'dist/routes/oauth.js',
    'dist/routes/api.js',
    'dist/routes/mcp.js',
    'dist/server.js'
];

filesToFix.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        fixImports(filePath);
    }
});

console.log('Import fixing completed!');