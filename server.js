const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// ======================= 配置区 =======================
const PORT = process.env.PORT || 3000;
const NEO4J_URI = "neo4j+s://7eb127cc.databases.neo4j.io";
const NEO4J_USER = "neo4j";
const NEO4J_PASSWORD = "wE7pV36hqNSo43mpbjTlfzE7n99NWcYABDFqUGvgSrk";
const TARGET_LABEL = "cc_data";
const ADMIN_PASSWORD = "admin888";

// DeepSeek AI 配置 (建议在 Render 环境变量中设置 DEEPSEEK_API_KEY)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-bdf96d7f1aa74a53a83ff167f7f2f5a9";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
// =====================================================

// Neo4j 连接
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const KEYWORD_LABEL = `Keyword_${TARGET_LABEL}`;
const LOG_LABEL = `Log_${TARGET_LABEL}`;

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 获取词云数据
async function getCloudData() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (k:${KEYWORD_LABEL}) RETURN k.text as name, k.count as value ORDER BY k.count DESC LIMIT 100`
        );
        return result.records.map(r => ({
            name: r.get('name'),
            value: r.get('value').toNumber ? r.get('value').toNumber() : r.get('value')
        }));
    } finally {
        await session.close();
    }
}

// 获取日志数据
async function getLogs() {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (l:${LOG_LABEL}) RETURN l.时间 as time, l.姓名 as name, l.内容 as content ORDER BY l.时间 DESC LIMIT 100`
        );
        return result.records.map(r => ({
            time: r.get('time'),
            name: r.get('name'),
            content: r.get('content')
        }));
    } finally {
        await session.close();
    }
}

// 添加弹幕
async function addDanmu(name, content) {
    const session = driver.session();
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    try {
        // 添加日志
        await session.run(
            `CREATE (l:${LOG_LABEL} {姓名: $name, 内容: $content, 时间: $timestamp})`,
            { name, content, timestamp }
        );
        // 更新词云
        await session.run(
            `MERGE (k:${KEYWORD_LABEL} {text: $content})
             ON CREATE SET k.count = 1
             ON MATCH SET k.count = k.count + 1`,
            { content }
        );
        return true;
    } finally {
        await session.close();
    }
}

// 清空词云
async function clearCloud() {
    const session = driver.session();
    try {
        await session.run(`MATCH (k:${KEYWORD_LABEL}) DETACH DELETE k`);
        return true;
    } finally {
        await session.close();
    }
}

// 清空所有数据
async function clearAll() {
    const session = driver.session();
    try {
        await session.run(`MATCH (n) WHERE n:${KEYWORD_LABEL} OR n:${LOG_LABEL} DETACH DELETE n`);
        return true;
    } finally {
        await session.close();
    }
}

// ======================= AI 总结功能 =======================
// 调用 DeepSeek API 进行 AI 总结
async function callDeepSeekAI(messages, systemPrompt) {
    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: messages }
            ],
            temperature: 0.7,
            max_tokens: 2000
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// AI 总结弹幕内容
async function summarizeDanmu(logs) {
    if (!logs || logs.length === 0) {
        return "暂无弹幕数据可供总结。";
    }
    
    // 整理弹幕内容
    const contents = logs.map(log => `${log.name}: ${log.content}`).join('\n');
    
    const systemPrompt = `你是一位专业的课堂反馈分析助手。请对学生的弹幕进行分析总结，包括：
1. 📊 **整体概览**：简要描述弹幕的整体情况（数量、活跃度等）
2. 🔥 **热点话题**：提炼出学生最关注的3-5个核心话题或观点
3. 💡 **精华观点**：挑选出最有价值、最有深度的学生发言（2-3条）
4. 📈 **情感倾向**：分析学生的整体情绪和态度（积极/消极/中性）
5. 💬 **建议反馈**：给老师的教学建议（如有）

请用简洁、清晰的语言，使用 Emoji 增加可读性。`;
    
    const userMessage = `以下是学生提交的弹幕内容，请进行分析总结：\n\n${contents}`;
    
    return await callDeepSeekAI(userMessage, systemPrompt);
}

// 提炼精华表达
async function extractEssence(logs) {
    if (!logs || logs.length === 0) {
        return "暂无弹幕数据可供提炼。";
    }
    
    const contents = logs.map(log => log.content).join('\n');
    
    const systemPrompt = `你是一位语言提炼专家。请从学生的弹幕中提炼精华，要求：
1. 去除重复和相似的表达
2. 保留最有价值的观点
3. 用更精炼的语言重新表达
4. 按主题分类整理
5. 每个类别保留3-5个精华表达

输出格式清晰，使用 Emoji 和分类标题。`;
    
    const userMessage = `以下是学生的弹幕内容，请提炼精华：\n\n${contents}`;
    
    return await callDeepSeekAI(userMessage, systemPrompt);
}

// 生成词云建议
async function generateWordCloudSuggestions(cloudData) {
    if (!cloudData || cloudData.length === 0) {
        return "暂无词云数据可供分析。";
    }
    
    const words = cloudData.map(item => `${item.name}(${item.value}次)`).join('、');
    
    const systemPrompt = `你是一位数据分析专家。请根据词云数据分析学生的关注点和学习状态，包括：
1. 🎯 **高频关键词分析**：解读出现频率最高的词汇代表的含义
2. 📚 **学习主题识别**：识别学生主要讨论的学习主题
3. 🤔 **潜在问题发现**：从关键词中发现可能存在的学习困惑或问题
4. ✨ **教学建议**：基于分析给出教学优化建议`;
    
    const userMessage = `以下是词云数据（词汇和出现次数）：\n\n${words}`;
    
    return await callDeepSeekAI(userMessage, systemPrompt);
}

// 针对问题的弹幕分析（简洁版，适合课堂展示）
async function analyzeForClassroom(logs, question) {
    if (!logs || logs.length === 0) {
        return "暂无弹幕数据可供分析。";
    }
    
    const contents = logs.map(log => `${log.name}: ${log.content}`).join('\n');
    
    const systemPrompt = `你是一位课堂助手，负责分析学生对问题的回答。请用简洁的语言总结，适合在课堂上展示给老师和学生一起看。

要求：
1. 语言简洁精炼，避免啰嗦
2. 提炼3-5个核心观点或精华表达
3. 用简短的标签或短句呈现
4. 使用 Emoji 增加可读性
5. 总字数控制在200字以内

输出格式示例：
🔥 **核心观点**
• 观点1
• 观点2
• 观点3

💎 **精华表达**
• "某同学的精彩回答"
• "另一个有价值的观点"`;

    let userMessage;
    if (question) {
        userMessage = `老师的问题是：「${question}」\n\n以下是学生的弹幕回答：\n${contents}`;
    } else {
        userMessage = `以下是学生的弹幕内容，请分析和提炼精华：\n${contents}`;
    }
    
    return await callDeepSeekAI(userMessage, systemPrompt);
}
// ===========================================================

// 当前问题（内存存储，服务重启会重置）
let currentQuestion = '';

// WebSocket 连接
io.on('connection', async (socket) => {
    console.log('用户连接:', socket.id);
    
    // 发送初始数据
    try {
        const cloudData = await getCloudData();
        const logs = await getLogs();
        socket.emit('init', { cloudData, logs });
        // 发送当前问题
        socket.emit('questionUpdate', { question: currentQuestion });
    } catch (err) {
        console.error('获取初始数据失败:', err);
    }
    
    // 接收新弹幕
    socket.on('danmu', async (data) => {
        const { name, content } = data;
        if (!name || !content) return;
        
        try {
            await addDanmu(name, content);
            const cloudData = await getCloudData();
            const logs = await getLogs();
            // 广播给所有用户
            io.emit('update', { cloudData, logs, newDanmu: { name, content } });
        } catch (err) {
            console.error('添加弹幕失败:', err);
            socket.emit('error', { message: '发送失败，请重试' });
        }
    });
    
    // 设置问题
    socket.on('setQuestion', async (data) => {
        if (data.password !== ADMIN_PASSWORD) {
            socket.emit('error', { message: '密码错误' });
            return;
        }
        currentQuestion = data.question || '';
        // 广播给所有用户
        io.emit('questionUpdate', { question: currentQuestion });
        socket.emit('success', { message: currentQuestion ? '问题已发布' : '问题已清除' });
    });
    
    // 验证管理员密码
    socket.on('verifyAdmin', (data) => {
        if (data.password === ADMIN_PASSWORD) {
            socket.emit('adminVerified', { success: true });
        } else {
            socket.emit('adminVerified', { success: false });
        }
    });
    
    // 请求刷新数据
    socket.on('requestData', async () => {
        try {
            const cloudData = await getCloudData();
            const logs = await getLogs();
            socket.emit('init', { cloudData, logs });
            socket.emit('questionUpdate', { question: currentQuestion });
        } catch (err) {
            console.error('获取数据失败:', err);
        }
    });
    
    // 管理员清空词云
    socket.on('clearCloud', async (data) => {
        if (data.password !== ADMIN_PASSWORD) {
            socket.emit('error', { message: '密码错误' });
            return;
        }
        try {
            await clearCloud();
            const cloudData = await getCloudData();
            io.emit('update', { cloudData, logs: await getLogs() });
            socket.emit('success', { message: '词云已清空' });
        } catch (err) {
            socket.emit('error', { message: '清空失败' });
        }
    });
    
    // 管理员清空所有
    socket.on('clearAll', async (data) => {
        if (data.password !== ADMIN_PASSWORD) {
            socket.emit('error', { message: '密码错误' });
            return;
        }
        try {
            await clearAll();
            io.emit('update', { cloudData: [], logs: [] });
            socket.emit('success', { message: '所有数据已清空' });
        } catch (err) {
            socket.emit('error', { message: '清空失败' });
        }
    });
    
    // =============== AI 分析（简化版）===============
    // AI 分析弹幕 - 适合课堂展示
    socket.on('aiAnalyze', async (data) => {
        if (data.password !== ADMIN_PASSWORD) {
            socket.emit('error', { message: '需要管理员密码' });
            return;
        }
        try {
            socket.emit('aiProcessing', { message: '🤖 AI 正在分析...' });
            const logs = await getLogs();
            const result = await analyzeForClassroom(logs, data.question || currentQuestion);
            // 发送给管理员
            socket.emit('aiResult', { content: result });
            // 广播给所有用户展示
            io.emit('aiResultBroadcast', { content: result });
        } catch (err) {
            console.error('AI 分析失败:', err);
            socket.emit('error', { message: 'AI 分析失败: ' + err.message });
        }
    });
    // ==============================================
    
    socket.on('disconnect', () => {
        console.log('用户断开:', socket.id);
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📱 手机访问请使用局域网IP`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    await driver.close();
    process.exit();
});
