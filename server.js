require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const KJUR = require('jsrsasign');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

// --- 配置 ---
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "glm-4-flash-250414";

// 验证环境变量
if (!ZHIPU_API_KEY || !ZHIPU_API_KEY.includes('.')) {
    console.error("错误：未找到有效的 ZHIPU_API_KEY。请在 .env 文件或环境变量中设置。格式应为 'id.secret'");
    process.exit(1);
}

// --- 中间件 ---
// 启用 GZIP 压缩
app.use(compression());

// 配置 CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://prompt.jobotek.onine'] // 生产环境域名
        : '*', // 开发环境允许所有来源
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP限制100次请求
    message: { error: '请求过于频繁，请稍后再试' }
});

app.use('/api/', limiter);
app.use(express.json({ limit: '1mb' }));

// --- 辅助函数 ---
function generateToken() {
    if (!ZHIPU_API_KEY) {
        throw new Error('未配置智谱API密钥');
    }

    const [id, secret] = ZHIPU_API_KEY.split('.');
    if (!id || !secret) {
        throw new Error('API密钥格式不正确');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = { alg: 'HS256', sign_type: 'SIGN' };
    const payload = {
        api_key: id,
        exp: exp,
        timestamp: now,
    };

    return KJUR.jws.JWS.sign(
        'HS256',
        JSON.stringify(header),
        JSON.stringify(payload),
        secret
    );
}

// 错误处理中间件
function errorHandler(err, req, res, next) {
    console.error('错误:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? '服务器内部错误' 
            : err.message
    });
}

// --- API 路由 ---
// 优化提示词接口
app.post('/api/optimize-prompt', async (req, res) => {
    try {
        const { prompt, requirements } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: '请提供需要优化的提示词' });
        }

        // 准备系统提示词
        const systemPrompt = `你是一位专业的提示词优化专家。你的任务是优化用户提供的提示词，使其更有效地与AI模型交互。

规则：
1. 生成三个不同版本的优化提示词
2. 每个版本都应该独立成行，不要添加序号或额外标记
3. 不要添加任何解释或说明文字

优化原则：
- 使提示词更具体、明确且有指导性
- 添加必要的上下文和背景信息
- 明确期望的输出格式和质量标准
- 保持自然、专业的语气
- 确保提示词简洁但信息完整

示例输入：
"写一篇文章"

示例输出：
请创建一篇2000字的深度文章，围绕核心论点展开，包含具体例子和数据支持，并以总结性段落结尾
撰写一篇结构清晰的文章，包含引言、3-4个主要论点和结论，每个观点都需要详细论证和实例说明
创作一篇专业性文章，运用行业术语和最新研究数据，确保论述逻辑严密，并提供实用的见解和建议`;

        // 准备用户提示词
        const userPrompt = requirements 
            ? `原始提示词：${prompt}\n要求：${requirements}`
            : prompt;

        // 调用智谱API
        const ZHIPU_API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        const token = generateToken();

        console.log('发送请求到智谱API...');
        console.log('Token:', token);
        
        const zhipuResponse = await fetch(ZHIPU_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                do_sample: true,
                temperature: 0.7,
                top_p: 0.7,
                max_tokens: 1000,
                stream: false,
                stop: [],
                repetition_penalty: 1.1
            })
        });

        console.log('API响应状态:', zhipuResponse.status);
        const responseText = await zhipuResponse.text();
        console.log('API响应内容:', responseText);

        if (!zhipuResponse.ok) {
            throw new Error(`智谱API请求失败: ${zhipuResponse.status} - ${responseText}`);
        }

        const data = JSON.parse(responseText);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('无效的API响应');
        }

        const optimizedPrompts = data.choices[0].message.content
            .split('\n')
            .filter(line => line.trim())
            .slice(0, 3);

        res.json({ results: optimizedPrompts });

    } catch (error) {
        console.error('优化提示词失败:', error);
        res.status(500).json({ error: '服务器错误，请稍后重试' });
    }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 应用错误处理中间件
app.use(errorHandler);

// --- 启动服务器 ---
app.listen(port, () => {
    console.log(`
服务器启动成功！
- 地址: http://localhost:${port}
- 环境: ${process.env.NODE_ENV || 'development'}
- 模型: ${MODEL_NAME}
    `);
});