// 單字存儲
let words = [];
let currentCardIndex = 0;

// DOM 元素
const homeView = document.getElementById('homeView');
const manageView = document.getElementById('manageView');
const navHome = document.getElementById('navHome');
const navManage = document.getElementById('navManage');
const flashCard = document.getElementById('flashCard');
const frontText = document.getElementById('frontText');
const backContent = document.getElementById('backContent');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const cardIndex = document.getElementById('cardIndex');
const totalCards = document.getElementById('totalCards');
const progressFill = document.getElementById('progressFill');
const message = document.getElementById('message');
const addWordForm = document.getElementById('addWordForm');
const englishInput = document.getElementById('englishInput');
const translationInput = document.getElementById('translationInput');
const rootAnalysisInput = document.getElementById('rootAnalysisInput');
const partOfSpeechInput = document.getElementById('partOfSpeechInput');
const exampleInput = document.getElementById('exampleInput');
const autoFillBtn = document.getElementById('autoFillBtn');
const wordsList = document.getElementById('wordsList');
const wordCount = document.getElementById('wordCount');
const loadingIndicator = document.getElementById('loadingIndicator');
const syncBtn = document.getElementById('syncBtn');
const usernameInput = document.getElementById('usernameInput');
const saveUserBtn = document.getElementById('saveUserBtn');

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// 初始化
function init() {
    loadWordsFromStorage();
    setupEventListeners();
    updateUI();
    loadSavedUser();
    // 載入示例數據（如果是第一次使用）
    if (words.length === 0) {
        loadSampleData();
    }
}

// 事件監聽
function setupEventListeners() {
    // 導航
    navHome.addEventListener('click', showHomeView);
    navManage.addEventListener('click', showManageView);

    // 卡片翻轉
    flashCard.addEventListener('click', flipCard);

    // 控制按鈕
    prevBtn.addEventListener('click', showPreviousCard);
    nextBtn.addEventListener('click', showNextCard);

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
        if (homeView.classList.contains('active')) {
            if (e.key === 'ArrowLeft') showPreviousCard();
            if (e.key === 'ArrowRight') showNextCard();
            if (e.key === ' ') {
                e.preventDefault();
                flipCard();
            }
        }
    });

    // 表單提交
    addWordForm.addEventListener('submit', handleAddWord);

    // 自動填入按鈕
    autoFillBtn.addEventListener('click', handleAutoFill);
    // 同步按鈕
    if (syncBtn) syncBtn.addEventListener('click', handleSyncAll);
    // 使用者儲存按鈕
    if (saveUserBtn) saveUserBtn.addEventListener('click', handleSaveUser);
    if (usernameInput) {
        usernameInput.addEventListener('blur', handleSaveUser);
        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveUser();
            }
        });
    }
}

function handleSaveUser() {
    const name = usernameInput ? usernameInput.value.trim() : '';
    if (!name) {
        showMessage('請輸入使用者名稱', 'error');
        return;
    }
    localStorage.setItem('vocab_username', name);
    showMessage('🔒 使用者已儲存', 'success');
    // 切換使用者後重置索引與畫面
    currentCardIndex = 0;
    renderWordsList();
    displayCard(currentCardIndex);
}

function loadSavedUser() {
    const name = localStorage.getItem('vocab_username') || '';
    if (usernameInput) usernameInput.value = name;
    currentCardIndex = 0;
    if (name) {
        showMessage(`歡迎回來，${name}`, 'success');
    }
    return name;
}

// 視圖切換
function showHomeView() {
    homeView.classList.add('active');
    manageView.classList.remove('active');
    navHome.classList.add('active');
    navManage.classList.remove('active');
}

function showManageView() {
    homeView.classList.remove('active');
    manageView.classList.add('active');
    navHome.classList.remove('active');
    navManage.classList.add('active');
    renderWordsList();
}

// 卡片翻轉
function flipCard() {
    if (words.length === 0) return;
    flashCard.classList.toggle('flipped');
}

// 顯示當前卡片
function displayCard(index) {
    const list = getVisibleWords();
    if (list.length === 0) {
        frontText.textContent = '沒有單字';
        backContent.innerHTML = '<div class="translation">請先在管理頁面添加單字</div>';
        return;
    }

    const word = list[index];
    frontText.textContent = word.english;

    backContent.innerHTML = `
        <div class="translation">${word.translation}</div>
        ${word.rootAnalysis ? `<div class="root-analysis">字根分析：${word.rootAnalysis}</div>` : ''}
        ${word.partOfSpeech ? `<div class="part-of-speech">${word.partOfSpeech}</div>` : ''}
        ${word.example ? `<div class="example">"${word.example}"</div>` : ''}
    `;

    // 重置翻轉狀態
    flashCard.classList.remove('flipped');
    
    // 更新進度
    cardIndex.textContent = index + 1;
    totalCards.textContent = list.length;
    const progressPercent = ((index + 1) / list.length) * 100;
    progressFill.style.width = progressPercent + '%';
}

// 上一個卡片
function showPreviousCard() {
    const list = getVisibleWords();
    if (list.length === 0) return;
    currentCardIndex = (currentCardIndex - 1 + list.length) % list.length;
    displayCard(currentCardIndex);
}

// 下一個卡片
function showNextCard() {
    const list = getVisibleWords();
    if (list.length === 0) return;
    currentCardIndex = (currentCardIndex + 1) % list.length;
    displayCard(currentCardIndex);
}

// 添加單字
async function handleAddWord(e) {
    e.preventDefault();

    const english = englishInput.value.trim();
    const translation = translationInput.value.trim();
    const rootAnalysis = rootAnalysisInput.value.trim();
    const partOfSpeech = partOfSpeechInput.value.trim();
    const example = exampleInput.value.trim();

    if (!english || !translation) {
        showMessage('請填入英文單字和中文翻譯', 'error');
        return;
    }

    // 檢查是否重複
    if (words.some(w => w.english.toLowerCase() === english.toLowerCase())) {
        showMessage('此單字已存在！', 'error');
        return;
    }

    const newWord = {
        id: Date.now(),
        english,
        translation,
        rootAnalysis,
        owner: localStorage.getItem('vocab_username') || '',
        partOfSpeech,
        example,
        createdAt: new Date().toLocaleString('zh-TW')
    };

    words.push(newWord);
    saveWordsToStorage();
    addWordForm.reset();
    renderWordsList();

    if (isBackendConfigured()) {
        try {
            await sendWordToBackend(newWord);
            showMessage('✅ 單字已送出並新增成功', 'success');
        } catch (error) {
            console.error('送出後端錯誤:', error);
            showMessage('⚠️ 單字已儲存到本機，但後端同步失敗，請確認 GAS_WEB_APP_URL 是否正確', 'warning');
        }
    } else {
        showMessage('⚠️ GAS_WEB_APP_URL 尚未設定，單字已儲存至本機。', 'warning');
    }

    // 自動切回首頁並顯示新的單字
    if (currentCardIndex === 0 && words.length > 1) {
        currentCardIndex = words.length - 1;
    }
    displayCard(currentCardIndex);
}

function isBackendConfigured() {
    return (
        GAS_WEB_APP_URL &&
        !GAS_WEB_APP_URL.includes('YOUR_DEPLOYMENT_ID') &&
        !GAS_WEB_APP_URL.includes('XXXXXXXXXXXX')
    );
}

async function sendWordToBackend(word) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'addWord', word })
    });

    if (!response.ok) {
        throw new Error(`後端回應失敗：${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || '後端返回錯誤');
    }
}

async function sendAllWordsToBackend(wordsArray) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'bulkAdd', words: wordsArray })
    });

    if (!response.ok) {
        throw new Error(`後端回應失敗：${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || '後端返回錯誤');
    }
}

async function handleSyncAll() {
    if (!words || words.length === 0) {
        showMessage('目前沒有單字可同步', 'info');
        return;
    }

    try {
        showMessage('🔁 正在同步所有單字到 Google 試算表...', 'info');
        await sendAllWordsToBackend(words);
        showMessage('✅ 所有單字已成功同步到 Google 試算表', 'success');
    } catch (error) {
        console.error('同步失敗:', error);
        showMessage('❌ 同步失敗，請檢查 GAS_WEB_APP_URL 與部署設定', 'error');
    }
}

// 自動填入功能
async function handleAutoFill() {
    const english = englishInput.value.trim();

    if (!english) {
        showMessage('請先輸入英文單字', 'error');
        return;
    }

    loadingIndicator.style.display = 'flex';
    autoFillBtn.disabled = true;

    try {
        // 使用 MyMemory API 翻譯
        const translationResponse = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(english)}&langpair=en|zh-TW`
        );
        const translationData = await translationResponse.json();
        
        if (translationData.responseStatus === 200) {
            translationInput.value = translationData.responseData.translatedText;
        }

        // 使用 Free Dictionary API 獲取詞性、例句與字根分析來源
        const dictResponse = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(english)}`
        );
        
        if (dictResponse.ok) {
            const dictData = await dictResponse.json();
            const entry = dictData[0];

            if (entry.meanings && entry.meanings.length > 0) {
                const meaning = entry.meanings[0];
                partOfSpeechInput.value = meaning.partOfSpeech || '';

                // 取得例句
                if (meaning.definitions && meaning.definitions.length > 0) {
                    const definition = meaning.definitions[0];
                    if (definition.example) {
                        exampleInput.value = definition.example;
                    }
                }
            }

            // 若 API 有 origin 資訊，當作字根分析來源
            if (entry.origin) {
                rootAnalysisInput.value = entry.origin;
            }

            showMessage('✅ 自動填入成功！', 'success');
        } else {
            showMessage('⚠️ 無法找到此單字的詞典資訊，但翻譯已填入', 'info');
        }
    } catch (error) {
        console.error('自動填入錯誤:', error);
        showMessage('❌ 自動填入失敗，請檢查網路連線', 'error');
    } finally {
        loadingIndicator.style.display = 'none';
        autoFillBtn.disabled = false;
    }
}

// 刪除單字
function deleteWord(id) {
    if (confirm('確定要刪除此單字嗎？')) {
        words = words.filter(w => w.id !== id);
        saveWordsToStorage();
        renderWordsList();
        
        // 調整當前卡片索引
        if (currentCardIndex >= words.length && currentCardIndex > 0) {
            currentCardIndex = words.length - 1;
        }
        displayCard(currentCardIndex);
        updateUI();
        showMessage('✅ 單字已刪除', 'success');
    }
}

function getCurrentUsername() {
    return localStorage.getItem('vocab_username') || '';
}

// 渲染單字列表
function renderWordsList() {
    const visible = getVisibleWords();
    wordCount.textContent = visible.length;

    if (visible.length === 0) {
        wordsList.innerHTML = '<div class="empty-state">還沒有單字，點擊新增吧！</div>';
        return;
    }

    wordsList.innerHTML = visible.map(word => `
        <div class="word-card">
            <div class="word-card-title">${escapeHtml(word.english)}</div>
            <div class="word-card-translation">${escapeHtml(word.translation)}</div>
            ${word.rootAnalysis ? `<div class="word-card-root">${escapeHtml(word.rootAnalysis)}</div>` : ''}
            ${word.partOfSpeech ? `<div class="word-card-pos">${escapeHtml(word.partOfSpeech)}</div>` : ''}
            ${word.example ? `<div class="word-card-example">"${escapeHtml(word.example)}"</div>` : ''}
            <div class="word-card-actions">
                <button class="btn-delete" onclick="deleteWord(${word.id})">🗑️ 刪除</button>
            </div>
        </div>
    `).join('');
}

function getVisibleWords() {
    const user = getCurrentUsername();
    if (!user) return words;
    return words.filter(w => (w.owner || '') === user);
}

// 顯示訊息
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message show ${type}`;
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

// 更新UI
function updateUI() {
    totalCards.textContent = words.length;
    if (words.length === 0) {
        cardIndex.textContent = '0';
        progressFill.style.width = '0%';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    }
    renderWordsList();
}

// 本地存儲
function saveWordsToStorage() {
    localStorage.setItem('words', JSON.stringify(words));
}

function loadWordsFromStorage() {
    const stored = localStorage.getItem('words');
    if (stored) {
        words = JSON.parse(stored);
    }
}

// 載入示例數據
function loadSampleData() {
    words = [
        {
            id: 1,
            english: 'serendipity',
            translation: '意外發現；巧合',
            partOfSpeech: '名詞',
            example: 'Meeting my best friend was pure serendipity.',
            createdAt: new Date().toLocaleString('zh-TW')
        },
        {
            id: 2,
            english: 'ephemeral',
            translation: '短暫的；轉瞬即逝的',
            partOfSpeech: '形容詞',
            example: 'The beauty of cherry blossoms is ephemeral.',
            createdAt: new Date().toLocaleString('zh-TW')
        },
        {
            id: 3,
            english: 'eloquent',
            translation: '雄辯的；能言善辯的',
            partOfSpeech: '形容詞',
            example: 'His eloquent speech moved the entire audience.',
            createdAt: new Date().toLocaleString('zh-TW')
        },
        {
            id: 4,
            english: 'meticulous',
            translation: '細心的；一絲不苟的',
            partOfSpeech: '形容詞',
            example: 'She is meticulous in her work and never makes mistakes.',
            createdAt: new Date().toLocaleString('zh-TW')
        },
        {
            id: 5,
            english: 'procrastinate',
            translation: '拖延；耽擱',
            partOfSpeech: '動詞',
            example: 'Do not procrastinate on your assignments.',
            createdAt: new Date().toLocaleString('zh-TW')
        }
    ];
    saveWordsToStorage();
    updateUI();
    displayCard(0);
}

// 安全轉義HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 啟動應用
init();

// 頁面加載完成後顯示第一張卡片
window.addEventListener('load', () => {
    displayCard(currentCardIndex);
});
