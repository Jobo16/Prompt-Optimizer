document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const elements = {
        promptInput: document.getElementById('prompt-input'),
        requirementsInput: document.getElementById('requirements-input'),
        generateButton: document.getElementById('generate-button'),
        loading: document.getElementById('loading'),
        resultsSection: document.getElementById('results-section'),
        pasteButton: document.getElementById('paste-button')
    };

    // API端点
    const API_ENDPOINT = '/api/optimize-prompt';

    // 初始化事件监听器
    function initEventListeners() {
        elements.generateButton.addEventListener('click', generateOptimizedPrompts);
        elements.pasteButton.addEventListener('click', handlePaste);
        initResultCardListeners();
    }

    // 处理粘贴功能
    async function handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            elements.promptInput.value = text;
            showToast('已粘贴剪贴板内容', 'success');
        } catch (err) {
            console.error('粘贴失败:', err);
            showToast('无法访问剪贴板', 'error');
        }
    }

    // 初始化结果卡片的事件监听器
    function initResultCardListeners() {
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', handleCopy);
        });

        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', handleEdit);
        });
    }

    // 处理复制功能
    async function handleCopy(event) {
        const card = event.target.closest('.result-card');
        const textElement = card.querySelector('.result-text');
        const text = textElement.textContent;

        try {
            await navigator.clipboard.writeText(text);
            showToast('已复制到剪贴板', 'success');
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败', 'error');
        }
    }

    // 处理编辑功能
    function handleEdit(event) {
        const card = event.target.closest('.result-card');
        const textElement = card.querySelector('.result-text');
        
        // 如果已经在编辑状态，直接返回
        if (card.querySelector('.edit-textarea')) {
            return;
        }

        const currentText = textElement.textContent;
        const textarea = document.createElement('textarea');
        textarea.value = currentText;
        textarea.className = 'edit-textarea';
        
        textElement.style.display = 'none';
        card.insertBefore(textarea, textElement);
        textarea.focus();

        // 自动调整高度
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';

        function saveEdit() {
            const newText = textarea.value.trim();
            if (newText !== currentText) {
                textElement.textContent = newText;
                showToast('修改已保存', 'success');
            }
            textElement.style.display = 'block';
            textarea.remove();
        }

        // 处理回车键保存
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            }
            // ESC键取消编辑
            if (e.key === 'Escape') {
                textElement.style.display = 'block';
                textarea.remove();
            }
        });

        // 处理失去焦点时保存
        textarea.addEventListener('blur', () => {
            saveEdit();
        });
    }

    // 生成优化后的提示词
    async function generateOptimizedPrompts() {
        const prompt = elements.promptInput.value.trim();
        const requirements = elements.requirementsInput.value.trim();

        if (!prompt) {
            showToast('请输入需要优化的提示词', 'error');
            return;
        }

        elements.loading.style.display = 'block';
        elements.generateButton.disabled = true;

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    requirements: requirements
                })
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const data = await response.json();
            
            // 确保data.results是一个数组
            let results = [];
            if (data.choices && Array.isArray(data.choices)) {
                // 从API响应中提取内容
                results = data.choices.map(choice => choice.content);
            } else if (data.results && Array.isArray(data.results)) {
                results = data.results;
            } else if (typeof data === 'string') {
                results = [data];
            } else {
                console.error('Unexpected response format:', data);
                throw new Error('响应格式错误');
            }

            updateResults(results);
            showToast('提示词生成成功！', 'success');

        } catch (error) {
            console.error('Error:', error);
            showToast('生成失败，请稍后重试', 'error');
        } finally {
            elements.loading.style.display = 'none';
            elements.generateButton.disabled = false;
        }
    }

    // 更新结果显示
    function updateResults(results) {
        // 确保results是一个数组
        if (!Array.isArray(results)) {
            console.error('Results must be an array:', results);
            return;
        }

        // 清空现有结果
        elements.resultsSection.innerHTML = '';

        // 创建结果容器
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';

        // 生成结果卡片
        results.forEach((result, index) => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.innerHTML = `
                <div class="result-header">
                    <span class="result-number">优化版本 ${index + 1}</span>
                    <div class="result-actions">
                        <button class="copy-button" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="edit-button" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="result-text">${result}</div>
            `;
            resultsContainer.appendChild(resultCard);
        });

        // 添加到页面
        elements.resultsSection.appendChild(resultsContainer);

        // 初始化事件监听器
        initResultCardListeners();
    }

    // 显示提示信息
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 初始化页面
    initEventListeners();
});