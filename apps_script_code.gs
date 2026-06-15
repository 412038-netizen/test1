// Google Apps Script 範例：接收單字並寫入試算表
// 使用前請替換 spreadsheetId 與 sheetName

const SPREADSHEET_ID = '1HlunyuAIov-TsC3m93JW5j9dLT53XHdvcB4S51c9_bA';
const SHEET_NAME = '單字';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!payload) {
      return createJsonResponse({ success: false, message: '無效請求' });
    }

    const action = payload.action || '';
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('找不到工作表：' + SHEET_NAME);
    }

    if (action === 'addWord' && payload.word) {
      const w = payload.word;
      sheet.appendRow([
        new Date(),
        w.english || '',
        w.translation || '',
        w.rootAnalysis || '',
        w.partOfSpeech || '',
        w.example || ''
      ]);
      return createJsonResponse({ success: true });
    }

    if (action === 'bulkAdd' && Array.isArray(payload.words)) {
      const rows = payload.words.map(w => [
        new Date(),
        w.english || '',
        w.translation || '',
        w.rootAnalysis || '',
        w.partOfSpeech || '',
        w.example || ''
      ]);

      // 批次寫入（較快）
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      return createJsonResponse({ success: true, inserted: rows.length });
    }

    return createJsonResponse({ success: false, message: '未知的 action 或資料格式' });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.message });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
