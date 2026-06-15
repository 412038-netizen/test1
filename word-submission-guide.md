# 單字管理功能：前端送出到 Google Apps Script 的完整步驟

## 1. 功能需求
管理者可以在「管理單字」頁面中新增單字資料。

表單欄位包括：
- 英文單字
- 中文翻譯
- 字根分析
- 例句
- 詞性

當管理者填完資料並點擊「儲存單字」後，前端會把資料送到 Google Apps Script 後端，後端再將資料寫入 Google 試算表。

## 2. 前端變更
目前專案中前端已經完成以下調整：

### 2.1 `index.html`
- 在新增單字表單中加入 `字根分析` 欄位。
- 該欄位使用 textarea，允許管理者輸入字根拆解或語源筆記。

新增欄位範例：
```html
<div class="form-row">
  <div class="form-field">
    <label for="rootAnalysisInput">字根分析</label>
    <textarea id="rootAnalysisInput" placeholder="輸入字根分析" rows="2"></textarea>
  </div>
</div>
```

### 2.2 `script.js`
- 加入 `rootAnalysisInput` 參考。
- 把 `rootAnalysis` 一併打包到新增單字物件。
- 新增 `sendWordToBackend` 函式，將資料 POST 給 Google Apps Script。
- 更新 `displayCard` 與單字列表，顯示 `字根分析`。

目前 `script.js` 已新增的主要程式碼：
```js
const rootAnalysisInput = document.getElementById('rootAnalysisInput');
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

```js
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

  const newWord = {
    id: Date.now(),
    english,
    translation,
    rootAnalysis,
    partOfSpeech,
    example,
    createdAt: new Date().toLocaleString('zh-TW')
  };

  try {
    await sendWordToBackend(newWord);
    words.push(newWord);
    saveWordsToStorage();
    addWordForm.reset();
    showMessage('✅ 單字已送出並新增成功', 'success');
    renderWordsList();
  } catch (error) {
    console.error('送出後端錯誤:', error);
    showMessage('❌ 無法送出單字到後端，請稍後重試', 'error');
    return;
  }

  if (currentCardIndex === 0 && words.length > 1) {
    currentCardIndex = words.length - 1;
  }
  displayCard(currentCardIndex);
}
```

```js
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
```

### 2.3 `style.css`
- 新增 `root-analysis` 與 `word-card-root` 樣式，讓字根分析在卡片和列表中能夠有清晰的視覺呈現。

## 3. 後端：Google Apps Script
在 Google 雲端試算表中建立一個專用工作表（Sheet），例如命名為 `單字`。

### 3.1 試算表欄位
建議欄位順序：
- Timestamp
- English
- Translation
 - Owner
 - Root Analysis
- Part of Speech
- Example

### 3.2 建立新 Apps Script 專案
1. 開啟 Google 試算表。
2. 選單中選擇「擴充功能」→「Apps Script」。
3. 建立新檔案，將下列程式碼貼入：

```js
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!payload || payload.action !== 'addWord' || !payload.word) {
      return createJsonResponse({ success: false, message: '無效請求' });
    }

    const word = payload.word;
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';
    const sheetName = '單字';

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`找不到工作表：${sheetName}`);
    }

    sheet.appendRow([
      new Date(),
      word.english || '',
      word.translation || '',
      word.owner || '',
      word.rootAnalysis || '',
      word.partOfSpeech || '',
      word.example || ''
    ]);

    return createJsonResponse({ success: true });
  } catch (error) {
    return createJsonResponse({ success: false, message: error.message });
  }
}

function createJsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3.3 部署為 Web App
1. 在 Apps Script 編輯器中，點選 `部署` → `新建部署`。
2. 選擇「網頁應用程式」。
3. 設定：
   - 版本說明：例如 `初始部署`
   - 執行應用程式的身分：自己的帳號
   - 可存取對象：任何人（如果你希望任何前端都能存取）或僅限你自己/組織內部。
4. 部署後複製產生的 Web App URL。
5. 將 `script.js` 中的 `GAS_WEB_APP_URL` 改成該網址。

範例：
```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
```

### 3.4 取得試算表 ID
你提供的 Google 試算表為：
```
https://docs.google.com/spreadsheets/d/1HlunyuAIov-TsC3m93JW5j9dLT53XHdvcB4S51c9_bA/edit
```

範例 Apps Script 應該使用這個試算表 ID：
```js
const spreadsheetId = '1HlunyuAIov-TsC3m93JW5j9dLT53XHdvcB4S51c9_bA';
```

將 `YOUR_SPREADSHEET_ID` 替換成這個實際 ID。
## 4. 測試流程
1. 開啟 `index.html`，切換到「管理單字」頁面。
2. 輸入：英文單字、中文翻譯、字根分析、詞性、例句。
  - 在上方 `使用者帳號（暱稱）` 欄位輸入你的帳號或暱稱並按「🔒 儲存」，系統會把該名稱作為 `Owner` 存入試算表。
3. 點擊「➕ 新增單字」。
4. 確認畫面顯示成功訊息。
5. 檢查 Google 試算表是否已新增一列新資料。

### 同步所有既有單字到試算表

前端已新增「🔁 同步至 Google 試算表」按鈕，會把目前 localStorage 或記憶中的所有單字批次送到 Apps Script 的 `bulkAdd` API。使用流程：

1. 部署 Apps Script（見第 3.3 步驟）並取得 Web App URL。
2. 在 `script.js` 中把 `GAS_WEB_APP_URL` 設為你的 Web App URL。
3. 開啟網頁，切到「管理單字」，點 `🔁 同步至 Google 試算表`。
4. 成功時會顯示成功訊息；失敗請查看瀏覽器 Console 與 Network。

範例：按鈕會呼叫 POST，body 範例：
```json
{
  "action": "bulkAdd",
  "words": [ {"english":"...","translation":"...","owner":"your-name","rootAnalysis":"...","partOfSpeech":"...","example":"..."}, ... ]
}
```

### 帳號與驗證說明
- 本實作提供輕量級的本地帳號機制：使用者在頁面輸入「使用者帳號（暱稱）」後會儲存在瀏覽器的 `localStorage`，新增或同步的單字會帶上該 `owner` 字段寫入試算表。
- 若你需要更嚴謹的身分驗證（例如避免偽造 owner、取得使用者 email），建議使用 Google Sign-In 或 OAuth 並將取得的使用者識別（例如 email）帶到後端；這需要在前端整合 Google API 並修改 Apps Script 來驗證身分。這裡可提供範例如需。

## 5. 常見問題與排查
- `sendWordToBackend` 失敗：確認 `GAS_WEB_APP_URL` 是否正確，並且 Apps Script 已成功部署。
- `後端回應失敗`：檢查 Apps Script 是否允許 POST，或試算表 ID/工作表名稱是否正確。
- 如果沒有資料寫入試算表：確認 Google Apps Script 是否取得正確試算表權限。
- 如果前端仍然只儲存於 localStorage：表示後端請求未成功；先檢查瀏覽器開發者工具中的 Network、Console 訊息。

## 6. 已完成的檔案改動
- `index.html`：新增 `字根分析` 表單欄位。
- `script.js`：新增 `rootAnalysis` 欄位與 `sendWordToBackend()`；改為 `async handleAddWord`。
- `style.css`：新增 `root-analysis` 樣式。
- `word-submission-guide.md`：建立詳細教學文件。

> 注意：目前範例程式碼中 `GAS_WEB_APP_URL` 與 `YOUR_SPREADSHEET_ID` 仍需替換成你實際部署後的網址與試算表 ID。