# 版本更新紀錄 (Dev Notes)

## v.F2601022132

### 1. 訂單篩選功能 (Order Filtering)

**功能描述**：
在會員專區的「訂單明細」分頁中，新增了五個狀態篩選按鈕，可依照訂單狀態篩選顯示的項目。

**前端實作細節**：
*   **檔案**：`member.html`, `function.js`
*   **UI 元件**：
    *   新增 5 個按鈕：全部 (`all`)、預約中 (`reserved`)、住宿中 (`staying`)、已完成 (`completed`)、已取消 (`cancelled`)。
    *   按鈕 HTML 結構：`<button class="order-filter" data-status="STATUS_CODE">`。
*   **資料結構**：
    *   訂單項目 (`.member-order-item`) 新增 `data-status="STATUS_CODE"` 屬性，對應按鈕的 `data-status`。
*   **邏輯處理 (`function.js`)**：
    *   新增 `initOrderFilters()` 函式。
    *   監聽按鈕點擊事件，比對按鈕與訂單項目的 `data-status`。
    *   若為 `all` 則顯示全部，否則僅顯示屬性相符的項目 (透過 `style.display` 控制)。

**交接注意事項 (Backend)**：
*   後端渲染訂單列表時，必須在 `.member-order-item` div 上正確填入 `data-status` 屬性 (e.g., `reserved`, `staying`, `completed`, `cancelled`)，否則篩選功能將失效。

---

### 2. 訂單明細內容調整 (Order Details Structure)

**功能描述**：
調整訂單卡片的顯示資訊，移除房型顯示，並新增「服務項目」欄位，預留 ID 供資料庫串接。

**前端實作細節**：
*   **檔案**：`member.html`
*   **移除內容**：移除了原本跟在天數後面的房型文字 (如：「?小型犬房」)。
*   **新增內容**：
    *   新增服務項目 `<span>`。
    *   **ID 命名規則**：`id="service-{OrderId}"` (例如：`service-PH20251216001`)。
    *   **Class**：統一加上 `class="service-info"`。

**交接注意事項 (Backend)**：
*   請利用 `id="service-{OrderId}"` 來定位 DOM 元素，並填入該筆訂單所選購的服務名稱 (如：基礎照護、精緻美容)。
*   若需統一修改樣式，可針對 `.service-info` class 進行 CSS 調整。

---

### 3. 照顧日誌連結與互動 (Care Log Linking)

**功能描述**：
針對「住宿中」與「已完成」的訂單，提供「查看照顧日誌」按鈕，點擊後自動切換至日誌分頁並定位到該筆訂單的日誌。

**前端實作細節**：
*   **檔案**：`member.html`
*   **按鈕邏輯**：
    *   **預約中 / 已取消**：不顯示任何操作按鈕。
    *   **住宿中 / 已完成**：顯示 `<button>`，並綁定 `onclick="switchToLogs('OrderId')"` 事件。
*   **日誌項目 (`#tab-logs`)**：
    *   日誌文章 (`article.care-log-item`) 新增 ID：`id="log-{OrderId}"`。
*   **互動腳本 (`switchToLogs` function)**：
    1.  觸發「照顧日誌」Tab 的點擊事件 (切換分頁)。
    2.  接收 `orderId` 參數。
    3.  使用 `document.getElementById('log-' + orderId)` 尋找目標日誌。
    4.  使用 `scrollIntoView` 平滑捲動至該日誌。
    5.  加入短暫的背景色閃爍效果 (Highlight) 提示使用者。

**交接注意事項 (Backend)**：
*   **按鈕生成**：在渲染訂單列表時，需判斷訂單狀態。若有日誌可看，需生成按鈕並填入正確的 `onclick="switchToLogs('訂單編號')"`。
*   **日誌生成**：在渲染照顧日誌列表時，務必為每篇日誌的 `<article>` 標籤加上 `id="log-{訂單編號}"`，否則連結功能無法定位。

---

### 4. 檔案變更摘要

*   `member.html`: 修改 HTML 結構，加入 ID、Data Attributes、Onclick 事件。
*   `function.js`: 新增篩選器邏輯 `initOrderFilters`。
