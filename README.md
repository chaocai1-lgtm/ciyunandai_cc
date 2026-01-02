# 🔐 项目配置信息（私密文档）

> ⚠️ **重要**: 此文档包含敏感信息，请勿上传到 GitHub 或公开分享！

---

## 📊 Neo4j 数据库配置

### 连接信息
```
URI: neo4j+s://7eb127cc.databases.neo4j.io
用户名: neo4j
密码: wE7pV36hqNSo43mpbjTlfzE7n99NWcYABDFqUGvgSrk
数据标签: cc_data
```

### 访问地址
- **控制台**: https://console.neo4j.io/
- **Browser**: neo4j+s://7eb127cc.databases.neo4j.io

---

## 🤖 DeepSeek AI 配置

### API 信息
```
账号: caichaotest01
API Key: sk-bdf96d7f1aa74a53a83ff167f7f2f5a9
API URL: https://api.deepseek.com/chat/completions
模型: deepseek-chat
```

### 管理地址
- **平台**: https://platform.deepseek.com/
- **文档**: https://platform.deepseek.com/docs

---

## 🔑 系统管理密码

### 管理员密码
```
密码: admin888
用途: 
  - 设置/清除问题
  - 清空词云/所有数据
  - 触发 AI 分析
```

---

## 🌐 Render 部署配置

### 环境变量设置
在 Render 控制台 → Environment 标签添加：

| 变量名 | 值 |
|--------|-----|
| `DEEPSEEK_API_KEY` | `sk-bdf96d7f1aa74a53a83ff167f7f2f5a9` |
| `PORT` | 自动设置（Render 提供） |

### 仓库信息
```
GitHub 仓库: https://github.com/chaocai1-lgtm/ciyunandai_cc
分支: main
根目录: （留空，使用仓库根目录）
```

### 部署命令
```bash
Build Command: npm install
Start Command: npm start
```

---

## 📝 快速配置代码片段

### server.js 配置段
```javascript
// Neo4j 配置
const NEO4J_URI = "neo4j+s://7eb127cc.databases.neo4j.io";
const NEO4J_USER = "neo4j";
const NEO4J_PASSWORD = "wE7pV36hqNSo43mpbjTlfzE7n99NWcYABDFqUGvgSrk";
const TARGET_LABEL = "cc_data";

// 管理员密码
const ADMIN_PASSWORD = "admin888";

// DeepSeek AI 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-bdf96d7f1aa74a53a83ff167f7f2f5a9";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
```

---

## 🔒 安全建议

### ✅ 已做安全措施
- [x] DeepSeek API Key 使用环境变量（Render 部署）
- [x] 代码中保留默认值作为本地测试使用

### ⚠️ 注意事项
1. **不要**将此文档推送到 GitHub
2. **不要**在公开场合分享这些信息
3. **定期更换**管理员密码
4. **监控** Neo4j 和 DeepSeek 的使用量
5. 如需分享代码，创建 `.env.example` 模板文件

### 📋 .gitignore 配置
确保以下文件被忽略：
```
配置信息_私密.md
.env
.env.local
*.private.*
```

---

## 📞 联系方式备份

### Neo4j 支持
- 官网: https://neo4j.com/
- 文档: https://neo4j.com/docs/

### DeepSeek 支持
- 官网: https://www.deepseek.com/
- API 文档: https://platform.deepseek.com/docs

### Render 支持
- 官网: https://render.com/
- 文档: https://render.com/docs

---

**创建时间**: 2026年1月2日  
**最后更新**: 2026年1月2日
