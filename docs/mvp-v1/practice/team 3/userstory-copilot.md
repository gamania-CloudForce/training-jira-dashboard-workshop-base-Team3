## User Story

**US-001**: 作為產品經理（PM），我希望能在 Jira 儀表板上即時看到所有未完成 Issue，並根據其 Priority 判斷是否超時（如 High 3 天、Medium 7 天、Low 14 天），若超時則在表格中以顏色或警示圖示標示，讓我能一目了然辨識逾期風險。

### 驗收標準（Acceptance Criteria）
- 儀表板能以表格方式列出所有沒有 Resolved 時間的 Issue。
- 表格每列顯示 Issue 的 Key、Summary、Priority、Created 時間、已經過天數、允許時限、是否超時。
- 超時的 Issue 以紅色底色或警示圖示（如⚠️）明顯標示。
- 未超時的 Issue 正常顯示。
- PM 能一目了然辨識所有逾期未完成的 Issue。

---

#### AC01: 未完成 Issue 超時警示（表格顯示）
```gherkin
場景：Issue 未完成且超過預期處理時間
Given 有 Issue 沒有 Resolved 時間
And 已取得該 Issue 的 Priority 與 Created 時間
When 該 Issue 經過的天數超過 Priority 對應的允許處理時限（High 3 天、Medium 7 天、Low 14 天）
Then 儀表板表格應以紅色或警示圖示標示該 Issue 為超時
And PM 能一目了然辨識逾期風險
```

### INVEST 原則檢查
- **V（Valuable）**：對 PM 有明確專案控管價值 ✓
- **T（Testable）**：可根據超時條件驗證 ✓
- **S（Small）**：可於一個 Sprint 內完成
- **I（Independent）**：可獨立開發

---

> 依據 [User Story 撰寫指引](../../../guides/user-story-guide.md) 產出
