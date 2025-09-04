# Spec 02 - US 01: 專案切換功能 Task 清單

## 概述

實作 Jira Dashboard 中的專案切換功能，允許使用者依照專案篩選資料。

## 需求摘要

- **功能**：新增專案選擇器，類似現有的 Sprint 選擇器
- **資料欄位**：Google Sheets 中的 `Projects` 欄位
- **篩選邏輯**：Project 和 Sprint 使用 AND 邏輯（同時篩選）
- **預設行為**：顯示所有專案（"All Projects"）
- **UI 位置**：放在 Sprint 選擇器的左方

## 技術架構

- **前端**：React + TypeScript + shadcn/ui
- **後端**：.NET Core Web API
- **資料源**：Google Sheets
- **狀態管理**：React Hooks

## Task 清單

### Task 1: 後端 API 擴展

**優先級**: High  
**預估時間**: 2-3 小時

#### 子任務

- [ ] 1.1 新增 `/api/table/projects` API 端點

  - 從 Google Sheets 中讀取 `Projects` 欄位的唯一值
  - 返回格式: `["All", "Project A", "Project B", ...]`
  - 實作快取機制（5 分鐘過期）

- [ ] 1.2 修改現有統計 API 支援專案篩選

  - 修改 `/api/dashboard/stats` 支援 `project` 查詢參數
  - 修改 `/api/dashboard/status-distribution` 支援 `project` 查詢參數
  - 確保 Project 和 Sprint 參數可以同時使用（AND 邏輯）

- [ ] 1.3 更新 Google Sheets 服務類別
  - 在 `GoogleSheetsService.cs` 中新增專案相關方法
  - 確保 `Projects` 欄位正確讀取和解析
  - 處理空值和重複值

#### 驗收標準

- [ ] `/api/table/projects` 成功返回專案清單
- [ ] 統計 API 正確處理專案篩選參數
- [ ] 專案和 Sprint 同時篩選功能正常
- [ ] API 響應時間在可接受範圍內

---

### Task 2: 前端 Hook 擴展

**優先級**: High  
**預估時間**: 1-2 小時

#### 子任務

- [ ] 2.1 修改 `useDashboard` hook 介面

  ```typescript
  interface UseDashboardParams {
    project?: string; // 新增
    sprint?: string;
  }

  interface UseDashboardReturn {
    // 現有屬性
    stats: DashboardStats | null;
    statusDistribution: StatusDistribution | null;
    sprintOptions: string[];
    projectOptions: string[]; // 新增
    loading: boolean;
    error: string | null;
    refetch: () => void;
  }
  ```

- [ ] 2.2 新增專案選項載入邏輯

  - 呼叫 `/api/table/projects` API
  - 處理載入狀態和錯誤情況
  - 實作適當的快取策略

- [ ] 2.3 更新統計資料請求邏輯
  - 將 `project` 參數傳遞給 API 請求
  - 確保參數變更時重新載入資料

#### 驗收標準

- [ ] Hook 正確回傳專案選項
- [ ] 專案參數變更時資料正確更新
- [ ] 載入和錯誤狀態正確處理

---

### Task 3: UI 組件實作

**優先級**: Medium  
**預估時間**: 1-2 小時

#### 子任務

- [ ] 3.1 在 `jira-dashboard.tsx` 中新增專案狀態

  ```typescript
  const [selectedProject, setSelectedProject] = useState<string>("All");
  ```

- [ ] 3.2 修改 useDashboard 呼叫

  ```typescript
  const {
    stats,
    statusDistribution,
    sprintOptions,
    projectOptions,
    loading,
    error,
    refetch,
  } = useDashboard({
    project: selectedProject === "All" ? undefined : selectedProject,
    sprint: selectedSprint === "All" ? undefined : selectedSprint,
  });
  ```

- [ ] 3.3 新增專案選擇器 UI 組件

  - 使用與 Sprint 選擇器相同的樣式
  - 放置在 Sprint 選擇器左方
  - 寬度設為 200px 保持一致性

- [ ] 3.4 更新 header 布局
  ```tsx
  <div className="flex items-center gap-4 ml-auto">
    {/* Project 選擇器 - 左方 */}
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Project:</label>
      <Select value={selectedProject} onValueChange={setSelectedProject}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Project" />
        </SelectTrigger>
        <SelectContent>
          {projectOptions.map((project) => (
            <SelectItem key={project} value={project}>
              {project}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Sprint 選擇器 - 右方 */}
    {/* 現有的 Sprint 選擇器代碼 */}
  </div>
  ```

#### 驗收標準

- [ ] 專案選擇器正確顯示在 Sprint 選擇器左方
- [ ] 選擇器樣式與 Sprint 選擇器一致
- [ ] 選擇專案時資料正確更新
- [ ] 預設顯示 "All" 專案

---

### Task 4: 響應式設計優化

**優先級**: Low  
**預估時間**: 0.5-1 小時

#### 子任務

- [ ] 4.1 檢查小螢幕設備上的顯示

  - 確保兩個選擇器在手機上正確排列
  - 必要時調整 gap 和寬度

- [ ] 4.2 測試不同螢幕尺寸
  - 桌面版 (>= 1024px)
  - 平板版 (768px - 1024px)
  - 手機版 (< 768px)

#### 驗收標準

- [ ] 各種螢幕尺寸下 UI 顯示正常
- [ ] 選擇器不會重疊或顯示異常

---

### Task 5: 整合測試

**優先級**: High  
**預估時間**: 1 小時

#### 子任務

- [ ] 5.1 功能測試

  - 測試專案選擇功能
  - 測試專案和 Sprint 的組合篩選
  - 測試 "All" 選項的行為

- [ ] 5.2 邊界情況測試

  - 測試專案選項為空的情況
  - 測試 API 錯誤的處理
  - 測試載入狀態的顯示

- [ ] 5.3 效能測試
  - 檢查頁面載入時間
  - 確保篩選變更響應迅速

#### 驗收標準

- [ ] 所有功能測試通過
- [ ] 錯誤情況妥善處理
- [ ] 效能符合預期

---

## 依賴關係

1. Task 1 (後端) → Task 2 (Hook) → Task 3 (UI)
2. Task 4 和 Task 5 可與其他任務平行進行

## 風險與注意事項

1. **資料結構**：需確認 Google Sheets 中 `Projects` 欄位的格式是否一致
2. **效能影響**：新增篩選條件可能影響查詢效能
3. **向後兼容**：確保現有功能不受影響
4. **快取策略**：專案清單變更頻率較低，可考慮較長的快取時間

## 完成標準

- [ ] 所有 Task 完成並通過測試
- [ ] 程式碼經過 Code Review
- [ ] 功能在開發環境中正常運作
- [ ] 文檔更新（如需要）

---

**建立日期**: 2024 年 9 月 4 日  
**負責人**: 開發團隊  
**預估總時間**: 5-8 小時
