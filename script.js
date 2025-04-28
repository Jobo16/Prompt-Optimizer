const promptInput = document.getElementById('prompt-input');
const requirementsInput = document.getElementById('requirements-input');
const generateButton = document.getElementById('generate-button');
const loadingIndicator = document.getElementById('loading');
const resultsSection = document.getElementById('results-section');
const resultCards = resultsSection.querySelectorAll('.result-card');
const copyButtons = resultsSection.querySelectorAll('.copy-button');

// --- 配置 ---
// 后端 API 的地址 (使用相对路径，由 Nginx 反向代理处理)
const BACKEND_API_ENDPOINT = '/api/optimize-prompt'; // 使用引号将其定义为字符串
//const BACKEND_API_ENDPOINT = 'http://localhost:3000/api/optimize-prompt';
// 移除 ZHIPU_API_KEY, ZHIPU_API_ENDPOINT, MODEL_NAME

// --- 事件监听 ---
generateButton.addEventListener('click', handleGenerateClick);

copyButtons.forEach(button => {
    button.addEventListener('click', handleCopyClick);
});

// --- 功能函数 ---

async function handleGenerateClick() {
    const userPrompt = promptInput.value.trim();
    const userRequirements = requirementsInput.value.trim();

    if (!userPrompt) {
        alert('请输入你的提示词！');
        return;
    }

    // 系统提示现在由前端定义，发送给后端
    let systemPrompt = `你是一个提示词优化助手。请根据用户输入的原始提示词和可选的要求，生成3个不同的、更优化、更具体、更有效的提示词版本，用于输入给大语言模型。
请严格遵守以下格式输出：
1.  生成 **正好 3 个** 优化后的提示词。
2.  每个提示词 **单独占一行**。
3.  **不要** 在每个提示词前添加任何编号（如 1., 2., 3.）或标记（如 -）。
4.  **不要** 添加任何额外的解释、标题或说明文字，直接输出三个提示词，每个一行。`;

    let combinedPrompt = `原始提示词：\n${userPrompt}\n\n`;
    if (userRequirements) {
        combinedPrompt += `要求：\n${userRequirements}\n\n`;
    }

    showLoading(true);
    clearResults();

    try {
        // 调用后端 API 获取三个结果
        const optimizedPrompts = await callBackendAPI(systemPrompt, combinedPrompt); // 修改调用函数

        if (optimizedPrompts && optimizedPrompts.length > 0) {
             // 假设 API 返回的是一个包含三个提示词的字符串，用换行符分隔
            const promptsArray = optimizedPrompts.split('\n').map(p => p.trim()).filter(p => p.length > 0);
            displayResults(promptsArray.slice(0, 3));
        } else {
            // 后端应该已经处理了空结果的情况，但以防万一
            displayError('未能从后端获取有效的优化结果。');
        }

    } catch (error) {
        console.error('调用后端 API 时出错:', error);
        // 显示从后端传来的错误信息或通用错误
        displayError(`生成失败: ${error.message || '无法连接到后端服务'}`);
    } finally {
        showLoading(false);
    }
}

// 修改：调用后端 API 而不是直接调用智谱 API
async function callBackendAPI(systemPrompt, userPrompt) {
    const response = await fetch(BACKEND_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        // 将 systemPrompt 和 userPrompt 发送给后端
        body: JSON.stringify({
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
        })
    });

    const data = await response.json(); // 解析后端返回的 JSON

    if (!response.ok) {
        // 如果后端返回错误，则抛出错误，错误信息在 data.error 中
        throw new Error(data.error || `请求失败: ${response.status} ${response.statusText}`);
    }

    // 假设后端成功时返回 { optimizedPrompts: "..." }
    if (data.optimizedPrompts) {
        return data.optimizedPrompts;
    } else {
        console.error("后端响应格式不符合预期:", data);
        return null;
    }
}

// --- 移除 JWT Token 生成函数 ---
// function generateToken(apiKey) { ... } // 删除整个函数

function showLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
    generateButton.disabled = isLoading;
}

function clearResults() {
    resultCards.forEach(card => {
        card.querySelector('.result-text').textContent = '...';
        card.style.display = 'none'; // 先隐藏
    });
}

function displayResults(prompts) {
     if (!prompts || prompts.length === 0) {
        // 如果没有结果，显示提示信息
        resultCards.forEach((card, index) => {
            card.querySelector('.result-text').textContent = index === 0 ? '未能生成提示词' : '...';
            card.style.display = index === 0 ? 'flex' : 'none'; // 只显示第一个卡片提示错误
        });
        return;
    }
    prompts.forEach((prompt, index) => {
        if (index < resultCards.length) {
            const card = resultCards[index];
            card.querySelector('.result-text').textContent = prompt;
            card.style.display = 'flex'; // 显示卡片
        }
    });
     // 隐藏未使用的卡片
    for (let i = prompts.length; i < resultCards.length; i++) {
        resultCards[i].style.display = 'none';
    }
}

function displayError(message) {
    // 可以在结果区域显示错误，或者使用 alert
    alert(`错误: ${message}`);
     // 清理界面状态
    resultCards.forEach(card => {
        card.querySelector('.result-text').textContent = '生成失败';
        card.style.display = 'flex'; // 显示卡片以便看到错误信息
    });
     for (let i = 1; i < resultCards.length; i++) { // 只保留第一个显示错误，隐藏其他
        resultCards[i].style.display = 'none';
    }
}

function handleCopyClick(event) {
    const button = event.target;
    const resultId = button.getAttribute('data-result-id');
    const resultCard = document.getElementById(resultId);
    const textToCopy = resultCard.querySelector('.result-text').textContent;

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            // 可选：给用户一个复制成功的反馈
            const originalText = button.textContent;
            button.textContent = '已复制!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 1500); // 1.5秒后恢复原状
        })
        .catch(err => {
            console.error('无法复制文本: ', err);
            alert('复制失败，请手动复制。');
        });
}