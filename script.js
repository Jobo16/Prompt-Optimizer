document.addEventListener('DOMContentLoaded', () => {
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
    const API_ENDPOINT = 'http://localhost:3000/api/optimize-prompt';

    // 初始化事件监听器
    initEventListeners();

    // 初始化快捷键
    initShortcuts();

    function initEventListeners() {
        // 生成按钮点击事件
        elements.generateButton.addEventListener('click', generateOptimizedPrompts);

        // 粘贴按钮点击事件
        elements.pasteButton.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                elements.promptInput.value = text;
                showToast('已粘贴剪贴板内容', 'success');
            } catch (err) {
                console.error('粘贴失败:', err);
                showToast('无法访问剪贴板', 'error');
            }
        });

        // 复制按钮点击事件
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', handleCopy);
        });

        // 编辑按钮点击事件
        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', handleEdit);
        });
    }

    function initShortcuts() {
        // 添加Ctrl+Enter快捷键
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                generateOptimizedPrompts();
            }
        });
    }

    async function generateOptimizedPrompts() {
        const userPrompt = elements.promptInput.value.trim();
        const requirements = elements.requirementsInput.value.trim();

        // 输入验证
        if (!userPrompt) {
            showToast('请输入提示词', 'error');
            return;
        }

        try {
            // 显示加载状态
            elements.loading.style.display = 'block';
            elements.generateButton.disabled = true;

            // 发送请求到后端
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userPrompt,
                    requirements: requirements
                })
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const data = await response.json();
            
            // 更新结果显示
            updateResults(data.results);
            
            // 显示成功提示
            showToast('提示词生成成功！', 'success');

        } catch (error) {
            console.error('Error:', error);
            showToast('生成失败，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态和隐藏加载提示
            elements.loading.style.display = 'none';
            elements.generateButton.disabled = false;
        }
    }

    function updateResults(results) {
        const resultCards = document.querySelectorAll('.result-card');
        
        results.forEach((result, index) => {
            if (index < resultCards.length) {
                const card = resultCards[index];
                const textElement = card.querySelector('.result-text');
                textElement.textContent = result;
                card.style.display = 'block';
            }
        });

        // 隐藏多余的结果卡片
        for (let i = results.length; i < resultCards.length; i++) {
            resultCards[i].style.display = 'none';
        }
    }

    async function handleCopy(event) {
        const button = event.currentTarget;
        const resultId = button.dataset.resultId;
        const resultCard = document.getElementById(resultId);
        const textElement = resultCard.querySelector('.result-text');
        
        try {
            await navigator.clipboard.writeText(textElement.textContent);
            showToast('复制成功！', 'success');
        } catch (err) {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制', 'error');
        }
    }

    function handleEdit(event) {
        const button = event.currentTarget;
        const resultCard = button.closest('.result-card');
        const textElement = resultCard.querySelector('.result-text');
        const originalText = textElement.textContent;

        // 创建编辑区域
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = originalText;
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-button';
        saveButton.innerHTML = '<i class="fas fa-check"></i>保存';
        
        editContainer.appendChild(textarea);
        editContainer.appendChild(saveButton);

        // 替换原有内容
        const resultContent = resultCard.querySelector('.result-content');
        const originalContent = resultContent.innerHTML;
        resultContent.innerHTML = '';
        resultContent.appendChild(editContainer);

        // 自动调整文本框高度
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';

        // 保存按钮点击事件
        saveButton.addEventListener('click', () => {
            const newText = textarea.value.trim();
            if (newText) {
                textElement.textContent = newText;
                resultContent.innerHTML = originalContent;
                showToast('修改已保存', 'success');
            }
        });

        // 聚焦到文本框
        textarea.focus();
    }

    function showToast(message, type = 'success') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建新的toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后消失
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});