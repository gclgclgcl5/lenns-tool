// 全局变量
let tasks = [];
let bookmarks = [];
let currentSort = 'deadline';
let notepadCompareMode = false;

// 笔记本相关变量
let notes = [];
let currentNote = null;
let nextNoteId = 1;
let searchQuery = '';

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initTranslator();
    initOCR();
    initTasks();
    initBookmarks();
    initNotepad();
    initNotebook();
    initSettings(); // 初始化设置功能
    loadData();
    
    // 确保DOM完全加载后再初始化拖拽
    setTimeout(() => {
        initDragAndDrop();
    }, 100);
});

// 初始化记事本功能
function initNotepad() {
    const compareModeBtn = document.getElementById('compare-mode-btn');
    const clearNotesBtn = document.getElementById('clear-notes-btn');
    const notepad1 = document.getElementById('notepad1');
    const notepad2 = document.getElementById('notepad2');
    const notepad2Section = document.getElementById('notepad2-section');
    const notepadArea = document.querySelector('.notepad-area');
    
    // 对比模式切换
    compareModeBtn.addEventListener('click', () => {
        notepadCompareMode = !notepadCompareMode;
        
        if (notepadCompareMode) {
            notepad2Section.style.display = 'flex';
            notepadArea.classList.add('compare-mode');
            compareModeBtn.innerHTML = '📖 单栏模式';
            showNotification('已开启对比模式', 'info');
        } else {
            notepad2Section.style.display = 'none';
            notepadArea.classList.remove('compare-mode');
            compareModeBtn.innerHTML = '📖 对比模式';
            showNotification('已关闭对比模式', 'info');
        }
        
        saveData();
    });
    
    // 清空记事本
    clearNotesBtn.addEventListener('click', () => {
        if (confirm('确定要清空记事本内容吗？')) {
            notepad1.value = '';
            notepad2.value = '';
            saveData();
            showNotification('记事本已清空', 'success');
        }
    });
    
    // 自动保存记事本内容
    notepad1.addEventListener('input', () => {
        saveData();
    });
    
    notepad2.addEventListener('input', () => {
        saveData();
    });
    
    // 记事本键盘快捷键
    notepad1.addEventListener('keydown', handleNotepadShortcuts);
    notepad2.addEventListener('keydown', handleNotepadShortcuts);
    
    function handleNotepadShortcuts(e) {
        // Ctrl+S 保存（实际上已经自动保存，这里只是给用户反馈）
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveData();
            showNotification('记事本内容已保存', 'success');
        }
        
        // Ctrl+A 全选
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.target.select();
            e.preventDefault();
        }
    }
}

// 初始化拖拽功能
function initDragAndDrop() {
    const functionsGrid = document.querySelector('.functions-grid');
    const functionAreas = document.querySelectorAll('.function-area');
    let draggedElement = null;
    let draggedIndex = -1;
    
    functionAreas.forEach((area, index) => {
        area.draggable = true;
        
        area.addEventListener('dragstart', (e) => {
            draggedElement = area;
            draggedIndex = Array.from(functionsGrid.children).indexOf(area);
            area.classList.add('dragging');
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
            
            // 添加视觉反馈
            setTimeout(() => {
                area.style.opacity = '0.5';
            }, 0);
        });
        
        area.addEventListener('dragend', (e) => {
            area.classList.remove('dragging');
            area.style.opacity = '1';
            draggedElement = null;
            draggedIndex = -1;
            
            // 移除所有拖拽相关的样式
            functionAreas.forEach(el => {
                el.classList.remove('drag-over');
            });
        });
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement && draggedElement !== area) {
                area.classList.add('drag-over');
            }
        });
        
        area.addEventListener('dragleave', (e) => {
            area.classList.remove('drag-over');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            
            if (draggedElement && draggedElement !== area) {
                const targetIndex = Array.from(functionsGrid.children).indexOf(area);
                
                // 简单的位置交换
                if (draggedIndex !== -1 && targetIndex !== -1) {
                    // 获取所有子元素
                    const allAreas = Array.from(functionsGrid.children);
                    
                    // 交换位置
                    if (draggedIndex < targetIndex) {
                        functionsGrid.insertBefore(draggedElement, area.nextSibling);
                    } else {
                        functionsGrid.insertBefore(draggedElement, area);
                    }
                    
                    saveLayoutOrder();
                    showNotification('功能区域位置已调整', 'success');
                }
            }
        });
    });
    
    // 双击重置布局 - 监听整个网格区域（仅在大屏幕上有效）
    functionsGrid.addEventListener('dblclick', (e) => {
        // 检查是否点击在功能区域之外，且在大屏幕上
        if (!e.target.closest('.function-area') && window.innerWidth > 1024) {
            resetLayout();
            showNotification('布局已重置为默认顺序', 'info');
        }
    });
}

// 保存布局顺序（仅在大屏幕上保存，避免保存响应式布局状态）
function saveLayoutOrder() {
    // 只在大屏幕(>1024px)上保存自定义布局顺序
    if (window.innerWidth > 1024) {
        const functionsGrid = document.querySelector('.functions-grid');
        const order = Array.from(functionsGrid.children).map(child => {
            return child.className.split(' ').find(cls => cls.includes('-area'));
        });
        localStorage.setItem('layout-order', JSON.stringify(order));
    }
}

// 恢复布局顺序
function restoreLayoutOrder() {
    try {
        const savedOrder = JSON.parse(localStorage.getItem('layout-order') || '[]');
        if (savedOrder.length === 0) return;
        
        // 验证布局数据的完整性
        const expectedAreas = [
            'translator-area', 'notepad-area', 'ocr-area', 
            'tasks-area', 'bookmarks-area', 'notebook-area'
        ];
        
        const functionsGrid = document.querySelector('.functions-grid');
        const areas = Array.from(functionsGrid.children);
        
        // 检查保存的布局是否包含所有必要的区域
        const isValidLayout = expectedAreas.every(areaClass => 
            savedOrder.includes(areaClass) && 
            areas.some(el => el.classList.contains(areaClass))
        );
        
        if (!isValidLayout) {
            console.log('布局数据不完整，清除旧配置');
            localStorage.removeItem('layout-order');
            return;
        }
        
        // 按保存的顺序重新排列
        savedOrder.forEach((areaClass) => {
            const area = areas.find(el => el.classList.contains(areaClass));
            if (area) {
                functionsGrid.appendChild(area);
            }
        });
    } catch (error) {
        console.error('恢复布局顺序失败:', error);
        // 出错时清除可能损坏的布局数据
        localStorage.removeItem('layout-order');
    }
}

// 重置布局为默认顺序
function resetLayout() {
    const functionsGrid = document.querySelector('.functions-grid');
    const defaultOrder = [
        'translator-area',
        'notepad-area', 
        'ocr-area',
        'tasks-area',
        'bookmarks-area',
        'notebook-area'
    ];
    
    defaultOrder.forEach(areaClass => {
        const area = document.querySelector(`.${areaClass}`);
        if (area) {
            functionsGrid.appendChild(area);
        }
    });
    
    localStorage.removeItem('layout-order');
}

// 初始化翻译功能
function initTranslator() {
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-lang-btn');
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    
    translateBtn.addEventListener('click', translateText);
    swapBtn.addEventListener('click', swapLanguages);
    
    // 实时翻译（防抖）
    let translateTimeout;
    sourceText.addEventListener('input', () => {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            if (sourceText.value.trim()) {
                translateText();
            }
        }, 1000);
    });
    
    async function translateText() {
        const text = sourceText.value.trim();
        if (!text) {
            showNotification('请输入要翻译的文字', 'error');
            return;
        }
        
        const from = sourceLang.value;
        const to = targetLang.value;
        
        if (from === to && from !== 'auto') {
            showNotification('源语言和目标语言不能相同', 'error');
            return;
        }
        
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<div class="loading"></div> 翻译中...';
        
        try {
            // 尝试多个翻译API
            let translatedText = await tryMultipleTranslationAPIs(text, from, to);
            
            if (translatedText) {
                targetText.value = translatedText;
                showNotification('翻译完成', 'success');
            } else {
                throw new Error('所有翻译服务都不可用');
            }
        } catch (error) {
            console.error('Translation error:', error);
            // 备用本地翻译逻辑
            const localTranslation = getLocalTranslation(text, from, to);
            targetText.value = localTranslation;
            showNotification('网络翻译不可用，使用了本地词典', 'info');
        }
        
        translateBtn.disabled = false;
        translateBtn.innerHTML = '🔄 翻译';
    }
    
    async function tryMultipleTranslationAPIs(text, from, to) {
        const APIs = [
            // Google Translate (通过代理)
            async () => {
                const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
                const data = await response.json();
                return data[0][0][0];
            },
            // MyMemory API
            async () => {
                const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
                const data = await response.json();
                return data.responseData.translatedText;
            },
            // Libre Translate (公共实例)
            async () => {
                const response = await fetch('https://libretranslate.de/translate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        q: text,
                        source: from === 'auto' ? 'en' : from,
                        target: to,
                        format: 'text'
                    })
                });
                const data = await response.json();
                return data.translatedText;
            }
        ];
        
        for (const api of APIs) {
            try {
                const result = await Promise.race([
                    api(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 5000))
                ]);
                if (result && result.trim()) {
                    return result;
                }
            } catch (error) {
                console.log('API failed, trying next:', error);
                continue;
            }
        }
        return null;
    }
    
    function getLocalTranslation(text, from, to) {
        // 本地词典翻译
        const translations = {
            'zh-en': {
                '你好': 'Hello',
                '谢谢': 'Thank you',
                '再见': 'Goodbye',
                '是': 'Yes',
                '不是': 'No',
                '请': 'Please',
                '对不起': 'Sorry',
                '水': 'Water',
                '食物': 'Food',
                '时间': 'Time',
                '今天': 'Today',
                '明天': 'Tomorrow',
                '昨天': 'Yesterday',
                '爱': 'Love',
                '工作': 'Work',
                '学习': 'Study',
                '朋友': 'Friend',
                '家': 'Home',
                '学校': 'School',
                '公司': 'Company'
            },
            'en-zh': {
                'hello': '你好',
                'thank you': '谢谢',
                'goodbye': '再见',
                'yes': '是',
                'no': '不是',
                'please': '请',
                'sorry': '对不起',
                'water': '水',
                'food': '食物',
                'time': '时间',
                'today': '今天',
                'tomorrow': '明天',
                'yesterday': '昨天',
                'love': '爱',
                'work': '工作',
                'study': '学习',
                'friend': '朋友',
                'home': '家',
                'school': '学校',
                'company': '公司'
            }
        };
        
        const langPair = `${from}-${to}`;
        const dict = translations[langPair] || {};
        const lowerText = text.toLowerCase();
        
        // 查找完全匹配
        if (dict[lowerText]) {
            return dict[lowerText];
        }
        
        // 查找部分匹配
        for (const [key, value] of Object.entries(dict)) {
            if (lowerText.includes(key) || key.includes(lowerText)) {
                return `${value} (部分匹配)`;
            }
        }
        
        // 如果没有找到匹配，返回带标记的原文
        return `[${to.toUpperCase()}] ${text}`;
    }
    
    function swapLanguages() {
        if (sourceLang.value === 'auto') {
            showNotification('自动检测模式下无法交换语言', 'error');
            return;
        }
        
        const tempLang = sourceLang.value;
        const tempText = sourceText.value;
        
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;
        sourceText.value = targetText.value;
        targetText.value = tempText;
    }
}

// 检查OCR库是否加载
function checkTesseractLoaded() {
    return new Promise((resolve) => {
        if (typeof Tesseract !== 'undefined') {
            resolve(true);
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 20; // 最多等待10秒
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof Tesseract !== 'undefined') {
                clearInterval(checkInterval);
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                resolve(false);
            }
        }, 500);
    });
}

// 初始化OCR功能
function initOCR() {
    const imageInput = document.getElementById('image-input');
    const dropZone = document.getElementById('drop-zone');
    const pasteBtn = document.getElementById('paste-btn');
    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const extractBtn = document.getElementById('extract-text-btn');
    const extractedText = document.getElementById('extracted-text');
    const copyBtn = document.getElementById('copy-text-btn');
    
    // 文件上传
    imageInput.addEventListener('change', handleImageSelect);
    
    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
    
    // 粘贴图片
    pasteBtn.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const clipboardItem of clipboardItems) {
                for (const type of clipboardItem.types) {
                    if (type.startsWith('image/')) {
                        const blob = await clipboardItem.getType(type);
                        handleImageFile(blob);
                        return;
                    }
                }
            }
            showNotification('剪贴板中没有图片', 'error');
        } catch (error) {
            console.error('粘贴失败:', error);
            showNotification('无法访问剪贴板，请手动上传图片', 'error');
        }
    });
    
    // 提取文字
    extractBtn.addEventListener('click', extractTextFromImage);
    
    // 复制文字
    copyBtn.addEventListener('click', () => {
        extractedText.select();
        document.execCommand('copy');
        showNotification('文字已复制到剪贴板', 'success');
    });
    
    // 初始化OCR状态检查
    checkOCRStatus();
    
    async function checkOCRStatus() {
        const ocrStatusText = document.getElementById('ocr-status-text');
        if (!ocrStatusText) return;
        
        ocrStatusText.innerHTML = '⏳ 检查OCR引擎状态...';
        
        try {
            const isLoaded = await checkTesseractLoaded();
            if (isLoaded) {
                ocrStatusText.innerHTML = '✅ OCR引擎已就绪';
                
                // 尝试预加载worker以确保真正可用
                try {
                    ocrStatusText.innerHTML = '⏳ 预热OCR引擎...';
                    const testWorker = await Tesseract.createWorker({
                        logger: () => {} // 静默日志
                    });
                    await testWorker.terminate();
                    ocrStatusText.innerHTML = '✅ OCR引擎预热完成，可以使用';
                } catch (preloadError) {
                    console.warn('OCR预加载失败:', preloadError);
                    ocrStatusText.innerHTML = '✅ OCR引擎已加载（需要网络连接）';
                }
            } else {
                ocrStatusText.innerHTML = '⚠️ OCR引擎未加载，请检查网络连接';
            }
        } catch (error) {
            console.error('OCR状态检查失败:', error);
            ocrStatusText.innerHTML = '❌ OCR引擎检查失败，请刷新页面';
        }
    }
    
    function handleImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    }
    
    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            showNotification('请选择图片文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewSection.style.display = 'block';
            extractedText.value = '';
            copyBtn.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    
    async function extractTextFromImage() {
        if (!previewImage.src) {
            showNotification('请先上传图片', 'error');
            return;
        }
        
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<div class="loading"></div> 识别中...';
        
        try {
            // 检查Tesseract是否可用
            const tesseractLoaded = await checkTesseractLoaded();
            if (!tesseractLoaded) {
                throw new Error('OCR库未加载，请检查网络连接');
            }
            
            showNotification('正在初始化文字识别引擎...', 'info');
            
                            // 使用简化的Worker创建方式
                let worker;
                try {
                    // 创建worker使用在线CDN资源
                    worker = await Tesseract.createWorker({
                        logger: m => {
                            console.log('Tesseract:', m);
                            if (m.status === 'loading tesseract core') {
                                extractBtn.innerHTML = '<div class="loading"></div> 加载核心引擎...';
                            } else if (m.status === 'initializing tesseract') {
                                extractBtn.innerHTML = '<div class="loading"></div> 初始化引擎...';
                            } else if (m.status === 'loading language traineddata') {
                                extractBtn.innerHTML = '<div class="loading"></div> 加载中文语言包...';
                            } else if (m.status === 'initializing api') {
                                extractBtn.innerHTML = '<div class="loading"></div> 准备识别...';
                            } else if (m.status === 'recognizing text') {
                                const progress = Math.round(m.progress * 100);
                                extractBtn.innerHTML = `<div class="loading"></div> 识别文字 ${progress}%`;
                            }
                        }
                    });
                    
                    // 先加载语言包，再初始化
                    extractBtn.innerHTML = '<div class="loading"></div> 加载中文语言包...';
                    await worker.loadLanguage('chi_sim+eng');
                    
                    extractBtn.innerHTML = '<div class="loading"></div> 初始化识别引擎...';
                    await worker.initialize('chi_sim+eng');
                
            } catch (workerError) {
                console.error('Worker创建失败:', workerError);
                throw new Error('文字识别引擎初始化失败，请检查网络连接');
            }
            
            try {
                extractBtn.innerHTML = '<div class="loading"></div> 开始识别文字...';
                
                // 设置识别参数
                const options = {
                    rectangle: { top: 0, left: 0, width: previewImage.naturalWidth, height: previewImage.naturalHeight }
                };
                
                const { data: { text, confidence } } = await worker.recognize(previewImage.src, options);
                
                await worker.terminate();
                
                // 智能清理识别的文本
                const cleanText = cleanOCRText(text);
                
                extractedText.value = cleanText;
                
                if (cleanText && cleanText.length > 2) {
                    copyBtn.style.display = 'inline-flex';
                    const confidenceText = confidence > 50 ? `(识别准确度: ${Math.round(confidence)}%)` : '';
                    showNotification(`文字识别完成！${confidenceText}`, 'success');
                } else {
                    showNotification('未识别到有效文字内容', 'info');
                    provideFallbackSuggestions('识别结果为空或过短');
                }
            } catch (recognizeError) {
                console.error('识别错误:', recognizeError);
                if (worker) {
                    try {
                        await worker.terminate();
                    } catch (terminateError) {
                        console.error('Worker终止失败:', terminateError);
                    }
                }
                throw recognizeError;
            }
            
        } catch (error) {
            console.error('OCR错误:', error);
            
            let errorMessage = error.message || '未知错误';
            let errorCategory = 'unknown';
            
            // 分类错误类型
            if (errorMessage.includes('SetImageFile') || errorMessage.includes('Cannot read properties of null')) {
                errorMessage = '图片处理失败，可能是图片格式不支持';
                errorCategory = 'image';
            } else if (errorMessage.includes('网络') || errorMessage.includes('fetch') || errorMessage.includes('load')) {
                errorMessage = '网络连接问题，无法下载识别组件';
                errorCategory = 'network';
            } else if (errorMessage.includes('Worker') || errorMessage.includes('createWorker')) {
                errorMessage = '识别引擎启动失败';
                errorCategory = 'worker';
            } else if (errorMessage.includes('未加载')) {
                errorMessage = 'OCR库未正确加载';
                errorCategory = 'library';
            }
            
            // 提供详细的错误信息和解决方案
            provideFallbackSuggestions(errorMessage, errorCategory);
            showNotification(`OCR识别失败: ${errorMessage}`, 'error');
        }
        
        extractBtn.disabled = false;
        extractBtn.innerHTML = '✨ 提取文字';
    }
    
    // OCR文本无空格清理函数
    function cleanOCRText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        // 完全移除所有空格和空白字符，只保留换行
        let cleanedText = text
            // 移除所有空格、制表符等空白字符（保留换行符）
            .replace(/[ \t\r\f\v]+/g, '')
            // 处理换行符：移除空行，合并多个换行
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            // 移除开头和结尾的换行
            .trim();
        
        return cleanedText;
    }
    
    function provideFallbackSuggestions(errorDetail = '', errorCategory = 'unknown') {
        let suggestions = ['❌ OCR文字识别遇到问题'];
        
        if (errorDetail) {
            suggestions.push('', `错误详情: ${errorDetail}`, '');
        }
        
        // 根据错误类型提供针对性建议
        switch (errorCategory) {
            case 'network':
                suggestions.push(
                    '🌐 网络问题解决方案：',
                    '1. 检查网络连接是否正常',
                    '2. 尝试更换网络环境',
                    '3. 等待网络稳定后重试',
                    '4. 确保可以访问CDN资源'
                );
                break;
                
            case 'image':
                suggestions.push(
                    '📸 图片问题解决方案：',
                    '1. 尝试其他格式的图片 (JPG/PNG)',
                    '2. 确保图片未损坏，可正常查看',
                    '3. 压缩图片大小后重试',
                    '4. 使用截图工具重新截取图片'
                );
                break;
                
            case 'worker':
            case 'library':
                suggestions.push(
                    '🔧 引擎问题解决方案：',
                    '1. 刷新页面重新加载',
                    '2. 确保网络连接正常',
                    '3. 使用Chrome或Firefox浏览器',
                    '4. 清除浏览器缓存后重试'
                );
                break;
                
            default:
                suggestions.push(
                    '🛠️ 通用解决方案：',
                    '1. 刷新页面重试',
                    '2. 检查网络连接是否正常',
                    '3. 使用Chrome或Firefox浏览器',
                    '4. 尝试更换网络环境'
                );
        }
        
        suggestions.push(
            '',
            '📸 图片优化建议：',
            '• 确保图片清晰、文字大小适中',
            '• 图片背景和文字对比度高',
            '• 避免倾斜或变形的文字',
            '• 尽量使用黑白色或高对比度图片',
            '',
            '🔄 替代方案：',
            '• 手动输入图片中的文字',
            '• 使用在线OCR工具（如百度、腾讯OCR）',
            '• 使用手机APP进行文字识别',
            '• 使用专业OCR软件',
            '',
            '💡 您也可以将文字手动输入到上方文本框中。'
        );
        
        extractedText.value = suggestions.join('\n');
        copyBtn.style.display = 'inline-flex';
    }
    

}

// 初始化任务管理功能
function initTasks() {
    const taskForm = document.getElementById('task-form');
    const sortBtns = document.querySelectorAll('.sort-btn');
    
    taskForm.addEventListener('submit', addTask);
    
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            renderTasks();
        });
    });
    
    function addTask(e) {
        e.preventDefault();
        
        const name = document.getElementById('task-name').value;
        const difficulty = parseInt(document.getElementById('task-difficulty').value);
        const deadline = document.getElementById('task-deadline').value;
        const implementation = parseInt(document.getElementById('task-implementation').value);
        
        const task = {
            id: Date.now(),
            name,
            difficulty,
            deadline: new Date(deadline),
            implementation,
            completed: false,
            createdAt: new Date()
        };
        
        tasks.push(task);
        saveData();
        renderTasks();
        taskForm.reset();
        showNotification('任务已添加', 'success');
    }
    
    window.toggleTask = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveData();
            renderTasks();
        }
    };
    
    window.deleteTask = function(id) {
        if (confirm('确定要删除这个任务吗？')) {
            tasks = tasks.filter(t => t.id !== id);
            saveData();
            renderTasks();
            showNotification('任务已删除', 'success');
        }
    };
}

function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    
    // 排序任务
    const sortedTasks = [...tasks].sort((a, b) => {
        switch (currentSort) {
            case 'deadline':
                return new Date(a.deadline) - new Date(b.deadline);
            case 'difficulty':
                return b.difficulty - a.difficulty;
            case 'implementation':
                return b.implementation - a.implementation;
            case 'priority':
                // 智能排序：综合考虑截止时间、难度等因素
                const aPriority = calculatePriority(a);
                const bPriority = calculatePriority(b);
                return bPriority - aPriority;
            default:
                return 0;
        }
    });
    
    tasksList.innerHTML = sortedTasks.map(task => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const isUrgent = deadline <= new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时内
        
        const difficultyLabels = ['', '简单', '中等', '困难', '极难'];
        const implementationLabels = ['', '容易实现', '需要研究', '技术挑战', '创新突破'];
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-header">
                    <div class="task-title">${task.name}</div>
                    <div class="task-badges">
                        <span class="badge difficulty-${task.difficulty}">${difficultyLabels[task.difficulty]}</span>
                        <span class="badge implementation-${task.implementation}">${implementationLabels[task.implementation]}</span>
                    </div>
                </div>
                <div class="task-deadline ${isUrgent ? 'urgent' : ''}">
                    截止时间: ${deadline.toLocaleString('zh-CN')}
                    ${isUrgent ? ' ⚠️ 即将到期' : ''}
                </div>
                <div class="task-actions">
                    <button class="btn ${task.completed ? 'secondary' : 'primary'}" 
                            onclick="toggleTask(${task.id})">
                        ${task.completed ? '↩️' : '✅'}
                        ${task.completed ? '取消完成' : '标记完成'}
                    </button>
                    <button class="btn secondary" onclick="deleteTask(${task.id})">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function calculatePriority(task) {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
    
    // 优先级计算：时间紧迫性 + 难度 + 实现复杂度
    let priority = 0;
    
    // 时间因素（时间越少优先级越高）
    if (daysLeft < 1) priority += 100;
    else if (daysLeft < 3) priority += 50;
    else if (daysLeft < 7) priority += 25;
    else priority += Math.max(0, 20 - daysLeft);
    
    // 难度因素
    priority += task.difficulty * 10;
    
    // 实现复杂度因素
    priority += task.implementation * 5;
    
    return priority;
}

// 初始化书签管理功能
function initBookmarks() {
    const bookmarkForm = document.getElementById('bookmark-form');
    
    bookmarkForm.addEventListener('submit', addBookmark);
    
    function addBookmark(e) {
        e.preventDefault();
        
        const name = document.getElementById('bookmark-name').value;
        const url = document.getElementById('bookmark-url').value;
        const color = document.getElementById('bookmark-color').value;
        
        // 确保URL格式正确
        let formattedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            formattedUrl = 'https://' + url;
        }
        
        const bookmark = {
            id: Date.now(),
            name,
            url: formattedUrl,
            color,
            createdAt: new Date()
        };
        
        bookmarks.push(bookmark);
        saveData();
        renderBookmarks();
        bookmarkForm.reset();
        document.getElementById('bookmark-color').value = '#3498db'; // 重置颜色
        showNotification('网站已添加', 'success');
    }
    
    window.deleteBookmark = function(id) {
        if (confirm('确定要删除这个网站吗？')) {
            bookmarks = bookmarks.filter(b => b.id !== id);
            saveData();
            renderBookmarks();
            showNotification('网站已删除', 'success');
        }
    };
}

// ===== 笔记本功能实现 =====

// 初始化笔记本功能
function initNotebook() {
    // 获取DOM元素
    const addNoteBtn = document.getElementById('add-note-btn');
    const exportNotesBtn = document.getElementById('export-notes-btn');
    const noteSearch = document.getElementById('note-search');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const noteWordCount = document.getElementById('note-word-count');

    // 事件监听器
    addNoteBtn.addEventListener('click', createNewNote);
    exportNotesBtn.addEventListener('click', exportNotes);
    saveNoteBtn.addEventListener('click', saveCurrentNote);
    deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    
    // 搜索功能
    noteSearch.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // 标题和内容自动保存
    noteTitle.addEventListener('input', () => {
        updateWordCount();
        autoSave();
    });
    noteContent.addEventListener('input', () => {
        updateWordCount();
        autoSave();
    });
    
    // 初始化显示
    renderNotesList();
}

// 创建新笔记
function createNewNote() {
    const newNote = {
        id: nextNoteId++,
        title: '',
        content: '',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    notes.push(newNote);
    selectNote(newNote);
    renderNotesList();
    showNotification('新笔记已创建', 'success');
    
    // 聚焦到标题输入框
    setTimeout(() => {
        document.getElementById('note-title').focus();
    }, 100);
}

// 选择笔记
function selectNote(note) {
    currentNote = note;
    
    const noteEditor = document.getElementById('note-editor');
    const noteWelcome = document.getElementById('note-welcome');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const noteDate = document.getElementById('note-date');
    
    // 显示编辑器，隐藏欢迎页
    noteEditor.style.display = 'flex';
    noteWelcome.style.display = 'none';
    
    // 填充内容
    noteTitle.value = note.title || '';
    noteContent.value = note.content || '';
    noteDate.textContent = `创建: ${formatDate(note.createdAt)} | 修改: ${formatDate(note.updatedAt)}`;
    
    updateWordCount();
    updateNotesList();
}

// 保存当前笔记
function saveCurrentNote() {
    if (!currentNote) return;
    
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    
    // 如果标题为空，使用内容的前20个字符作为标题
    let title = noteTitle.value.trim();
    if (!title && noteContent.value.trim()) {
        title = noteContent.value.trim().substring(0, 20) + (noteContent.value.trim().length > 20 ? '...' : '');
    }
    if (!title) {
        title = '无标题笔记';
    }
    
    currentNote.title = title;
    currentNote.content = noteContent.value;
    currentNote.updatedAt = new Date();
    
    noteTitle.value = title; // 更新标题输入框
    
    saveData();
    renderNotesList();
    updateNoteInfo();
    showNotification('笔记已保存', 'success');
}

// 删除当前笔记
function deleteCurrentNote() {
    if (!currentNote) return;
    
    if (confirm('确定要删除这个笔记吗？此操作无法恢复！')) {
        notes = notes.filter(note => note.id !== currentNote.id);
        
        // 如果还有其他笔记，选择第一个
        if (notes.length > 0) {
            selectNote(notes[0]);
        } else {
            // 没有笔记了，显示欢迎页
            currentNote = null;
            document.getElementById('note-editor').style.display = 'none';
            document.getElementById('note-welcome').style.display = 'flex';
        }
        
        saveData();
        renderNotesList();
        showNotification('笔记已删除', 'success');
    }
}

// 自动保存
let autoSaveTimeout;
function autoSave() {
    if (!currentNote) return;
    
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        saveCurrentNote();
    }, 2000); // 2秒后自动保存
}

// 搜索处理
function handleSearch() {
    const query = document.getElementById('note-search').value.toLowerCase().trim();
    searchQuery = query;
    renderNotesList();
}

// 清除搜索
function clearSearch() {
    document.getElementById('note-search').value = '';
    searchQuery = '';
    renderNotesList();
}

// 渲染笔记列表
function renderNotesList() {
    const notesList = document.getElementById('notes-list');
    
    // 过滤笔记
    let filteredNotes = notes;
    if (searchQuery) {
        filteredNotes = notes.filter(note => 
            (note.title && note.title.toLowerCase().includes(searchQuery)) ||
            (note.content && note.content.toLowerCase().includes(searchQuery))
        );
    }
    
    if (filteredNotes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-notes">
                📝
                <p>${searchQuery ? '没有找到匹配的笔记' : '暂无笔记<br>点击"新建笔记"开始'}</p>
            </div>
        `;
        return;
    }
    
    // 按更新时间排序
    filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    notesList.innerHTML = filteredNotes.map(note => {
        const title = note.title || '无标题笔记';
        const preview = note.content ? note.content.substring(0, 100) : '空白笔记';
        const isActive = currentNote && currentNote.id === note.id;
        
        return `
            <div class="note-item ${isActive ? 'active' : ''}" onclick="selectNoteById(${note.id})">
                <div class="note-item-title">${highlightText(title, searchQuery)}</div>
                <div class="note-item-preview">${highlightText(preview, searchQuery)}</div>
                <div class="note-item-date">${formatDate(note.updatedAt)}</div>
            </div>
        `;
    }).join('');
}

// 更新笔记列表选中状态
function updateNotesList() {
    const noteItems = document.querySelectorAll('.note-item');
    noteItems.forEach(item => {
        item.classList.remove('active');
        if (currentNote && item.onclick.toString().includes(currentNote.id)) {
            item.classList.add('active');
        }
    });
}

// 通过ID选择笔记
window.selectNoteById = function(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        selectNote(note);
    }
};

// 更新字数统计
function updateWordCount() {
    const noteContent = document.getElementById('note-content');
    const noteWordCount = document.getElementById('note-word-count');
    
    if (noteContent && noteWordCount) {
        const wordCount = noteContent.value.length;
        noteWordCount.textContent = `字数: ${wordCount}`;
    }
}

// 更新笔记信息
function updateNoteInfo() {
    if (!currentNote) return;
    
    const noteDate = document.getElementById('note-date');
    noteDate.textContent = `创建: ${formatDate(currentNote.createdAt)} | 修改: ${formatDate(currentNote.updatedAt)}`;
}

// 导出笔记
function exportNotes() {
    if (notes.length === 0) {
        showNotification('没有笔记可以导出', 'info');
        return;
    }
    
    // 创建导出内容
    let exportContent = '# 我的笔记本导出\n\n';
    exportContent += `导出时间: ${new Date().toLocaleString()}\n`;
    exportContent += `总计笔记: ${notes.length} 个\n\n`;
    exportContent += '---\n\n';
    
    notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    notes.forEach((note, index) => {
        exportContent += `## ${index + 1}. ${note.title || '无标题笔记'}\n\n`;
        exportContent += `**创建时间**: ${formatDate(note.createdAt)}\n`;
        exportContent += `**修改时间**: ${formatDate(note.updatedAt)}\n`;
        exportContent += `**字数**: ${note.content ? note.content.length : 0}\n\n`;
        
        if (note.content) {
            exportContent += '**内容**:\n\n';
            exportContent += note.content + '\n\n';
        } else {
            exportContent += '**内容**: (空白笔记)\n\n';
        }
        
        exportContent += '---\n\n';
    });
    
    // 创建下载
    const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `我的笔记本_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('笔记导出成功', 'success');
}

// 文本高亮
function highlightText(text, query) {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// 格式化日期
function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return '今天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 2) {
        return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        return `${diffDays - 1}天前`;
    } else {
        return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
}

function renderBookmarks() {
    const bookmarksGrid = document.getElementById('bookmarks-grid');
    
    bookmarksGrid.innerHTML = bookmarks.map(bookmark => `
        <a href="${bookmark.url}" target="_blank" class="bookmark-item" 
           style="background: ${bookmark.color};">
            <button class="bookmark-delete" onclick="event.preventDefault(); deleteBookmark(${bookmark.id})">
                ✖️
            </button>
            <div>${bookmark.name}</div>
        </a>
    `).join('');
}

// 数据存储和加载
function saveData() {
    const notepad1 = document.getElementById('notepad1');
    const notepad2 = document.getElementById('notepad2');
    
    const data = {
        version: '3.0', // 添加版本标识
        tasks,
        bookmarks,
        currentSort,
        notepadCompareMode,
        notepadContent1: notepad1 ? notepad1.value : '',
        notepadContent2: notepad2 ? notepad2.value : '',
        // 笔记本数据
        notes,
        nextNoteId,
        currentNoteId: currentNote ? currentNote.id : null
    };
    localStorage.setItem('toolbox-data', JSON.stringify(data));
}

function loadData() {
    try {
        const data = JSON.parse(localStorage.getItem('toolbox-data') || '{}');
        
        // 检查数据版本，清理旧版本的布局配置
        if (!data.version || data.version !== '3.0') {
            console.log('检测到旧版本配置数据，清理布局设置...');
            localStorage.removeItem('layout-order'); // 清除旧的布局配置
            showNotification('已更新为v3.0响应式布局系统，布局配置已重置', 'info');
            
            // 在控制台显示帮助信息
            console.group('📱 布局系统升级说明');
            console.log('✅ 已升级到v3.0响应式布局系统');
            console.log('🔧 如果布局仍有问题，可以使用以下控制台命令：');
            console.log('   showUserData() - 查看当前配置数据');
            console.log('   clearLayout() - 清除布局配置');
            console.log('   clearUserData() - 清除所有数据（慎用）');
            console.log('⌨️  快捷键: Ctrl+Shift+R - 重置所有配置');
            console.groupEnd();
        }
        
        if (data.tasks) {
            tasks = data.tasks.map(task => ({
                ...task,
                deadline: new Date(task.deadline),
                createdAt: new Date(task.createdAt)
            }));
        }
        
        if (data.bookmarks) {
            bookmarks = data.bookmarks;
        }
        
        if (data.currentSort) {
            currentSort = data.currentSort;
            // 更新排序按钮状态
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === currentSort);
            });
        }
        
        // 恢复记事本内容和状态
        const notepad1 = document.getElementById('notepad1');
        const notepad2 = document.getElementById('notepad2');
        const compareModeBtn = document.getElementById('compare-mode-btn');
        const notepad2Section = document.getElementById('notepad2-section');
        const notepadArea = document.querySelector('.notepad-area');
        
        if (notepad1 && data.notepadContent1) {
            notepad1.value = data.notepadContent1;
        }
        
        if (notepad2 && data.notepadContent2) {
            notepad2.value = data.notepadContent2;
        }
        
        if (data.notepadCompareMode && compareModeBtn) {
            notepadCompareMode = true;
            notepad2Section.style.display = 'flex';
            notepadArea.classList.add('compare-mode');
            compareModeBtn.innerHTML = '📖 单栏模式';
        }
        
        // 恢复笔记本数据
        if (data.notes) {
            notes = data.notes.map(note => ({
                ...note,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
            }));
        }
        
        if (data.nextNoteId) {
            nextNoteId = data.nextNoteId;
        }
        
        // 恢复当前选中的笔记
        if (data.currentNoteId && notes.length > 0) {
            const savedCurrentNote = notes.find(note => note.id === data.currentNoteId);
            if (savedCurrentNote) {
                currentNote = savedCurrentNote;
                // 延迟选择笔记，确保DOM元素已加载
                setTimeout(() => {
                    selectNote(currentNote);
                }, 300);
            }
        }
        
        renderTasks();
        renderBookmarks();
        renderNotesList();
        
        // 恢复布局顺序（仅在大屏幕上，避免干扰响应式设计）
        setTimeout(() => {
            // 只在大屏幕(>1024px)上恢复自定义布局顺序
            if (window.innerWidth > 1024) {
                restoreLayoutOrder();
            }
        }, 200);
        
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 通知功能
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Escape键清空当前焦点的输入框
    if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            if (activeElement.type !== 'datetime-local' && activeElement.type !== 'color') {
                activeElement.value = '';
                showNotification('输入框已清空', 'info');
            }
        }
    }
    
    // Ctrl/Cmd + M 切换记事本对比模式
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        const compareModeBtn = document.getElementById('compare-mode-btn');
        if (compareModeBtn) {
            compareModeBtn.click();
        }
    }
    
    // Ctrl/Cmd + T 快速添加任务（聚焦到任务名称输入框）
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        const taskNameInput = document.getElementById('task-name');
        if (taskNameInput) {
            taskNameInput.focus();
            showNotification('快速添加任务模式', 'info');
        }
    }
    
    // Ctrl/Cmd + Shift + R 重置所有配置
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (confirm('确定要重置所有配置吗？这将清除所有任务、笔记、布局设置等数据！')) {
            clearAllUserData();
        }
    }
});

// 清除所有用户数据的函数
function clearAllUserData() {
    try {
        // 清除localStorage中的所有项目数据
        localStorage.removeItem('toolbox-data');
        localStorage.removeItem('layout-order');
        
        // 重置全局变量
        tasks = [];
        bookmarks = [];
        currentSort = 'deadline';
        notepadCompareMode = false;
        notes = [];
        currentNote = null;
        nextNoteId = 1;
        searchQuery = '';
        
        // 刷新页面重新初始化
        location.reload();
        
    } catch (error) {
        console.error('清除数据失败:', error);
        showNotification('清除数据失败，请刷新页面重试', 'error');
    }
}

// 在控制台提供清理和调试函数
window.clearUserData = clearAllUserData;

// 调试函数：查看当前配置数据
window.showUserData = function() {
    const toolboxData = localStorage.getItem('toolbox-data');
    const layoutOrder = localStorage.getItem('layout-order');
    
    console.group('💾 用户配置数据');
    console.log('版本信息:', toolboxData ? JSON.parse(toolboxData).version || '旧版本' : '无数据');
    console.log('配置数据大小:', toolboxData ? (toolboxData.length / 1024).toFixed(2) + 'KB' : '0KB');
    console.log('布局配置:', layoutOrder ? JSON.parse(layoutOrder) : '无布局配置');
    console.log('完整数据:', {
        toolboxData: toolboxData ? JSON.parse(toolboxData) : null,
        layoutOrder: layoutOrder ? JSON.parse(layoutOrder) : null
    });
    console.groupEnd();
};

// 调试函数：仅清除布局配置
window.clearLayout = function() {
    localStorage.removeItem('layout-order');
    console.log('✅ 布局配置已清除，请刷新页面查看效果');
    showNotification('布局配置已清除', 'success');
};

// 定期保存数据（防止意外丢失）
setInterval(saveData, 30000); // 每30秒自动保存一次

// 页面卸载前保存数据
window.addEventListener('beforeunload', saveData);

// ===== 设置功能实现 =====

// 初始化设置功能
function initSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const exportConfigBtn = document.getElementById('export-config-btn');
    const importConfigBtn = document.getElementById('import-config-btn');
    const importConfigInput = document.getElementById('import-config-input');
    const resetAllBtn = document.getElementById('reset-all-btn');

    // 打开设置模态框
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        updateSystemInfo();
    });

    // 关闭设置模态框
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // 点击背景关闭模态框
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // 导出配置
    exportConfigBtn.addEventListener('click', exportConfiguration);

    // 导入配置
    importConfigBtn.addEventListener('click', () => {
        importConfigInput.click();
    });

    importConfigInput.addEventListener('change', handleImportConfiguration);

    // 重置所有数据
    resetAllBtn.addEventListener('click', () => {
        if (confirm('⚠️ 警告：此操作将清除所有数据，包括任务、书签、笔记等，且无法恢复！\n\n确定要继续吗？')) {
            if (confirm('🔴 最后确认：真的要删除所有数据吗？建议先导出备份！')) {
                clearAllUserData();
            }
        }
    });
}

// 导出配置文件
function exportConfiguration() {
    try {
        const toolboxData = localStorage.getItem('toolbox-data');
        const layoutOrder = localStorage.getItem('layout-order');
        
        const exportData = {
            exportInfo: {
                version: '3.0',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            },
            toolboxData: toolboxData ? JSON.parse(toolboxData) : null,
            layoutOrder: layoutOrder ? JSON.parse(layoutOrder) : null
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'text/plain;charset=utf-8' });
        
        const link = document.createElement('a');
        const fileName = `百宝箱配置备份_${new Date().toISOString().split('T')[0]}.txt`;
        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        link.click();
        
        URL.revokeObjectURL(link.href);
        showNotification('配置文件导出成功！', 'success');
        
        // 在控制台显示导出信息
        console.group('📁 配置导出成功');
        console.log('文件名:', fileName);
        console.log('数据大小:', (dataStr.length / 1024).toFixed(2) + 'KB');
        console.log('包含数据:', Object.keys(exportData));
        console.groupEnd();
        
    } catch (error) {
        console.error('导出配置失败:', error);
        showNotification('配置导出失败：' + error.message, 'error');
    }
}

// 处理导入配置
function handleImportConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
        showNotification('请选择.txt格式的配置文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const configData = JSON.parse(e.target.result);
            importConfiguration(configData);
        } catch (error) {
            console.error('解析配置文件失败:', error);
            showNotification('配置文件格式错误，无法导入', 'error');
        }
    };

    reader.onerror = function() {
        showNotification('读取文件失败', 'error');
    };

    reader.readAsText(file, 'utf-8');
    
    // 重置input值，允许重复选择同一文件
    event.target.value = '';
}

// 导入配置数据
function importConfiguration(configData) {
    try {
        // 验证配置数据格式
        if (!configData || typeof configData !== 'object') {
            throw new Error('配置数据格式无效');
        }

        // 验证是否是有效的导出文件
        if (!configData.exportInfo || !configData.toolboxData) {
            throw new Error('这不是有效的百宝箱配置文件');
        }

        const confirmMessage = `
📂 配置导入确认

文件信息：
• 导出时间：${new Date(configData.exportInfo.timestamp).toLocaleString()}
• 版本：${configData.exportInfo.version}
• 任务数量：${configData.toolboxData.tasks?.length || 0}
• 笔记数量：${configData.toolboxData.notes?.length || 0}
• 书签数量：${configData.toolboxData.bookmarks?.length || 0}

⚠️ 导入将覆盖当前所有数据，是否继续？
        `;

        if (!confirm(confirmMessage.trim())) {
            return;
        }

        // 备份当前数据
        const currentData = {
            toolboxData: localStorage.getItem('toolbox-data'),
            layoutOrder: localStorage.getItem('layout-order')
        };

        try {
            // 导入配置数据
            if (configData.toolboxData) {
                localStorage.setItem('toolbox-data', JSON.stringify(configData.toolboxData));
            }

            if (configData.layoutOrder) {
                localStorage.setItem('layout-order', JSON.stringify(configData.layoutOrder));
            }

            showNotification('配置导入成功！页面将刷新...', 'success');

            // 延迟刷新，让用户看到成功消息
            setTimeout(() => {
                location.reload();
            }, 1500);

            // 在控制台显示导入信息
            console.group('📥 配置导入成功');
            console.log('导入时间:', new Date().toISOString());
            console.log('原文件信息:', configData.exportInfo);
            console.log('导入的数据项:', Object.keys(configData));
            console.groupEnd();

        } catch (importError) {
            // 恢复备份数据
            if (currentData.toolboxData) {
                localStorage.setItem('toolbox-data', currentData.toolboxData);
            }
            if (currentData.layoutOrder) {
                localStorage.setItem('layout-order', currentData.layoutOrder);
            }
            throw importError;
        }

    } catch (error) {
        console.error('导入配置失败:', error);
        showNotification('导入失败：' + error.message, 'error');
    }
}

// 更新系统信息显示
function updateSystemInfo() {
    try {
        const toolboxData = localStorage.getItem('toolbox-data');
        const layoutData = localStorage.getItem('layout-order');
        
        let dataSize = 0;
        let tasksCount = 0;
        let notesCount = 0;
        
        if (toolboxData) {
            dataSize += toolboxData.length;
            const data = JSON.parse(toolboxData);
            tasksCount = data.tasks?.length || 0;
            notesCount = data.notes?.length || 0;
        }
        
        if (layoutData) {
            dataSize += layoutData.length;
        }
        
        document.getElementById('data-size-info').textContent = (dataSize / 1024).toFixed(2) + ' KB';
        document.getElementById('tasks-count-info').textContent = tasksCount;
        document.getElementById('notes-count-info').textContent = notesCount;
        
    } catch (error) {
        console.error('更新系统信息失败:', error);
    }
}

// 窗口大小改变时处理布局
window.addEventListener('resize', () => {
    // 防抖处理，避免频繁触发
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        const functionsGrid = document.querySelector('.functions-grid');
        if (functionsGrid) {
            // 如果从小屏幕切换到大屏幕，恢复自定义布局
            if (window.innerWidth > 1024) {
                restoreLayoutOrder();
            }
            // 如果从大屏幕切换到小屏幕，清除可能的干扰样式
            else {
                // 确保响应式布局正常工作
                functionsGrid.style.order = '';
            }
        }
    }, 250);
}); 