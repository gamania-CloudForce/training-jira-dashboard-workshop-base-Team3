## User Story

**US-001**: 作為產品經理（PM），我希望能在 Jira 儀表板上即時看到所有未完成 Issue，並根據其 Priority 判斷是否超時，若超時則給予明顯警示，以便能及早發現並處理專案風險。

### 驗收標準（Acceptance Criteria）
- 儀表板能列出所有沒有 Resolved 時間的 Issue。
- 每個未完成 Issue 會根據 Priority 計算允許處理時限。
- 若 Issue 經過的天數超過對應 Priority 的時限，儀表板以顏色或提示標示超時。
- PM 能一目了然辨識所有逾期未完成的 Issue。

---

#### AC01: 未完成 Issue 超時警示
```gherkin
場景：Issue 未完成且超過預期處理時間
Given 有 Issue 沒有 Resolved 時間
And 已取得該 Issue 的 Priority 與 Created 時間
When 該 Issue 經過的天數超過對應 Priority 的允許處理時限
Then 儀表板應以顏色或提示標示該 Issue 為超時
And PM 能一目了然辨識逾期風險
```

### INVEST 原則檢查
- **V（Valuable）**：對 PM 有明確專案控管價值 ✓
- **T（Testable）**：可根據超時條件驗證 ✓
- **S（Small）**：可於一個 Sprint 內完成
- **I（Independent）**：可獨立開發

---

> 依據 [User Story 撰寫指引](../../../guides/user-story-guide.md) 產出
