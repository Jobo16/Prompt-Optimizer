require('dotenv').config(); // 加载 .env 文件中的环境变量
const express = require('express');
const fetch = require('node-fetch');
const KJUR = require('jsrsasign');
const cors = require('cors');

const app = express();
const port = 3000; // 后端服务运行的端口

// --- 配置 ---
// 从环境变量获取 API Key (推荐!)
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
// 如果环境变量没有设置，则使用下面这个值 (不推荐用于生产环境!)
// const ZHIPU_API_KEY = "YOUR_ZHIPU_API_KEY"; // 在这里替换或使用 .env 文件

const ZHIPU_API_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const MODEL_NAME = "glm-4-flash-250414"; // 或者你选择的模型

if (!ZHIPU_API_KEY || !ZHIPU_API_KEY.includes('.')) {
    console.error("错误：未找到有效的 ZHIPU_API_KEY。请在 .env 文件或环境变量中设置。格式应为 'id.secret'");
    process.exit(1); // 启动失败
}

// --- 中间件 ---
app.use(cors()); // 允许所有来源的跨域请求 (开发时方便，生产环境可配置更严格规则)
app.use(express.json()); // 解析请求体中的 JSON 数据

// --- JWT Token 生成函数 (从前端移动过来) ---
function generateToken(apiKey) {
    const [id, secret] = apiKey.split('.');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // Token 有效期 1 小时

    const header = { alg: 'HS256', sign_type: 'SIGN' };
    const payload = {
        api_key: id,
        exp: exp,
        timestamp: now
    };

    try {
        const sHeader = JSON.stringify(header);
        const sPayload = JSON.stringify(payload);
        const sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, { utf8: secret });
        return sJWT;
    } catch (e) {
        console.error("生成 JWT 时出错:", e);
        return null; // 返回 null 表示失败
    }
}

// --- API 路由 ---
app.post('/api/optimize-prompt', async (req, res) => {
    const { systemPrompt, userPrompt } = req.body;

    if (!systemPrompt || !userPrompt) {
        return res.status(400).json({ error: '缺少 systemPrompt 或 userPrompt' });
    }

    const token = generateToken(ZHIPU_API_KEY);
    if (!token) {
        return res.status(500).json({ error: '无法生成 API Token' });
    }

    try {
        const zhipuResponse = await fetch(ZHIPU_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 500,
            })
        });

        const data = await zhipuResponse.json();

        if (!zhipuResponse.ok) {
            console.error('智谱 API 错误:', data);
            // 将智谱返回的错误信息传递给前端
            throw new Error(`API 请求失败: ${zhipuResponse.status} ${zhipuResponse.statusText} - ${data?.error?.message || '未知智谱 API 错误'}`);
        }

        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            res.json({ optimizedPrompts: data.choices[0].message.content });
        } else {
            console.error("智谱 API 响应格式不符合预期:", data);
            res.status(500).json({ error: '智谱 API 响应格式不符合预期' });
        }

    } catch (error) {
        console.error('调用智谱 API 时出错:', error);
        res.status(500).json({ error: `服务器错误: ${error.message}` });
    }
});

// --- 启动服务器 ---
app.listen(port, () => {
    console.log(`后端服务运行在 http://localhost:${port}`);
    console.log(`请确保 ZHIPU_API_KEY 已在 .env 文件或环境变量中正确设置。`);
});