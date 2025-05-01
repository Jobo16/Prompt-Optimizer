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
    const API_ENDPOINT = 'http://localhost:3000/api/optimize-prompt';

    // 初始化事件监听器
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

        // 初始化结果卡片的事件监听
        initResultCardListeners();
    }

    // 初始化结果卡片的事件监听器
    function initResultCardListeners() {
        // 复制按钮点击事件
        document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', handleCopy);
        });

        // 编辑按钮点击事件
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
        const currentText = textElement.textContent;

        // 创建输入框
        const textarea = document.createElement('textarea');
        textarea.value = currentText;
        textarea.className = 'edit-textarea';
        
        // 替换原有文本
        textElement.style.display = 'none';
        card.insertBefore(textarea, textElement);
        textarea.focus();

        // 添加保存按钮
        const saveButton = document.createElement('button');
        saveButton.textContent = '保存';
        saveButton.className = 'save-button';
        card.insertBefore(saveButton, textarea.nextSibling);

        // 保存按钮点击事件
        saveButton.addEventListener('click', () => {
            const newText = textarea.value.trim();
            textElement.textContent = newText;
            textElement.style.display = 'block';
            textarea.remove();
            saveButton.remove();
            showToast('修改已保存', 'success');
        });

        // 处理回车键保存
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveButton.click();
            }
        });

        // 处理点击其他区域保存
        function handleClickOutside(e) {
            if (!card.contains(e.target)) {
                saveButton.click();
                document.removeEventListener('click', handleClickOutside);
            }
        }
        // 延迟添加点击事件，避免立即触发
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);
    }

    // 生成优化后的提示词
    async function generateOptimizedPrompts() {
        const prompt = elements.promptInput.value.trim();
        const requirements = elements.requirementsInput.value.trim();

        if (!prompt) {
            showToast('请输入需要优化的提示词', 'error');
            return;
        }

        // 显示加载提示
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

    // 更新结果显示
    function updateResults(results) {
        elements.resultsSection.innerHTML = results.map((result, index) => `
            <div class="result-card">
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
            </div>
        `).join('');

        // 重新初始化结果卡片的事件监听器
        initResultCardListeners();
    }

    // 显示提示信息
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 添加显示类名触发动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 初始化
    initEventListeners();
});