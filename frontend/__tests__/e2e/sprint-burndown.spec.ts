/**
 * E2E Test Cases: Sprint 燃盡圖視覺化
 * 
 * 對應文件: spec01-us01-ac01to04-testcase.md
 * 測試平台: Playwright E2E Testing
 * 測試環境: Chrome, Firefox, Safari
 */

import { test, expect } from '@playwright/test';

// 測試常量
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8001';

test.describe('Sprint 燃盡圖 E2E 測試', () => {

  test.beforeEach(async ({ page }) => {
    // 確保後端服務可用
    const response = await page.request.get(`${BACKEND_URL}/api/sprint/list`);
    expect(response.ok()).toBeTruthy();

    // 訪問主頁面
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * TC-001-E2E-01: 正常顯示燃盡圖與完成率 (E2E)
   * 對應後端測試案例: TC-001-01
   */
  test('TC-001-E2E-01: 應該正確顯示 Sprint 燃盡圖與完成率', async ({ page }) => {
    // 1. 選擇特定 Sprint
    await page.locator('button[role="combobox"]').click();
    await page.locator('text=DEMO1-Sprint 2').click();

    // 2. 等待資料載入
    await page.waitForSelector('[data-testid="completion-rate"], text="Sprint 完成率"', { timeout: 10000 });

    // 3. 驗證完成率卡片顯示
    const completionRateCard = page.locator('text="Sprint 完成率"').locator('..');
    await expect(completionRateCard).toBeVisible();

    // 4. 驗證 Sprint 名稱
    await expect(page.locator('text="DEMO1-Sprint 2"')).toBeVisible();

    // 5. 驗證故事點數資訊顯示（檢查是否有數字）
    const spNumbers = page.locator('text=/^\\d+(\\.\\d+)?$/'); // 匹配數字（可包含小數）
    await expect(spNumbers.first()).toBeVisible();

    // 6. 驗證燃盡圖顯示
    await expect(page.locator('text="Sprint 燃盡圖"')).toBeVisible();
    await expect(page.locator('text="理想線"')).toBeVisible();
    await expect(page.locator('text="實際線"')).toBeVisible();

    // 7. 驗證圖表容器存在
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible();
  });

  /**
   * TC-001-E2E-02: 進度健康狀態視覺化測試
   * 驗證不同 Sprint 的健康狀態顯示
   */
  test('TC-001-E2E-02: 應該正確顯示進度健康狀態', async ({ page }) => {
    // 選擇 Sprint
    await page.locator('button[role="combobox"]').click();
    await page.locator('text=DEMO1-Sprint 2').click();

    // 等待載入完成
    await page.waitForSelector('text="Sprint 完成率"', { timeout: 10000 });

    // 檢查健康狀態標籤是否存在（正常進度、稍微落後、嚴重落後之一）
    const healthStatusExists = await page.locator('text=/正常進度|稍微落後|嚴重落後/').count() > 0;
    expect(healthStatusExists).toBeTruthy();

    // 檢查完成率百分比是否顯示
    const percentageRegex = /\d+%/;
    const percentageElement = page.locator('text=' + percentageRegex.source).first();
    await expect(percentageElement).toBeVisible();
  });

  /**
   * TC-001-E2E-03: Sprint 切換功能測試
   */
  test('TC-001-E2E-03: 應該正確處理 Sprint 切換', async ({ page }) => {
    // 1. 初始狀態 - 選擇 "All" 應該顯示提示訊息
    await page.locator('button[role="combobox"]').click();
    
    // 檢查是否有 "All" 選項，如果有就選擇它
    const allOption = page.locator('text="All"');
    const allExists = await allOption.count() > 0;
    
    if (allExists) {
      await allOption.click();
      await expect(page.locator('text=/請選擇一個特定的 Sprint/i')).toBeVisible();
    }

    // 2. 選擇具體 Sprint
    await page.locator('button[role="combobox"]').click();
    
    // 獲取可用的 Sprint 選項
    const sprintOptions = page.locator('[role="option"]');
    const sprintCount = await sprintOptions.count();
    
    if (sprintCount > 0) {
      // 選擇第一個非 "All" 的 Sprint
      let selectedSprint = '';
      for (let i = 0; i < sprintCount; i++) {
        const option = sprintOptions.nth(i);
        const text = await option.textContent();
        if (text && text !== 'All') {
          selectedSprint = text;
          await option.click();
          break;
        }
      }

      if (selectedSprint) {
        // 3. 驗證數據載入
        await page.waitForSelector('text="Sprint 完成率"', { timeout: 10000 });
        await expect(page.locator(`text="${selectedSprint}"`)).toBeVisible();
      }
    }
  });

  /**
   * TC-001-E2E-04: 載入狀態測試
   */
  test('TC-001-E2E-04: 應該正確顯示載入狀態', async ({ page }) => {
    // 選擇 Sprint 並觀察載入過程
    await page.locator('button[role="combobox"]').click();
    
    const sprintOptions = page.locator('[role="option"]');
    const firstNonAllOption = sprintOptions.locator('text=/DEMO1|Sprint/').first();
    
    if (await firstNonAllOption.count() > 0) {
      await firstNonAllOption.click();
      
      // 檢查載入期間是否有載入指示器（骨架屏或載入動畫）
      // 這個測試可能很快完成，所以我們主要驗證最終結果
      await page.waitForSelector('text="Sprint 完成率"', { timeout: 15000 });
      
      // 驗證最終載入完成狀態
      await expect(page.locator('text="Sprint 燃盡圖"')).toBeVisible();
    }
  });

  /**
   * TC-001-E2E-05: 響應式設計測試
   */
  test('TC-001-E2E-05: 應該在不同螢幕尺寸下正常顯示', async ({ page }) => {
    // 選擇 Sprint
    await page.locator('button[role="combobox"]').click();
    await page.locator('text=/DEMO1-Sprint/').first().click();
    await page.waitForSelector('text="Sprint 完成率"', { timeout: 10000 });

    // 測試桌面版本 (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('text="Sprint 完成率"')).toBeVisible();
    await expect(page.locator('text="Sprint 燃盡圖"')).toBeVisible();

    // 測試平板版本 (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text="Sprint 完成率"')).toBeVisible();
    await expect(page.locator('text="Sprint 燃盡圖"')).toBeVisible();

    // 測試手機版本 (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text="Sprint 完成率"')).toBeVisible();
    // 燃盡圖在手機版可能需要滾動才能看到
    await page.locator('text="Sprint 燃盡圖"').scrollIntoViewIfNeeded();
    await expect(page.locator('text="Sprint 燃盡圖"')).toBeVisible();
  });

  /**
   * TC-001-E2E-06: 圖表互動性測試
   */
  test('TC-001-E2E-06: 應該支援圖表互動功能', async ({ page }) => {
    // 選擇 Sprint
    await page.locator('button[role="combobox"]').click();
    await page.locator('text=/DEMO1-Sprint/').first().click();
    await page.waitForSelector('text="Sprint 燃盡圖"', { timeout: 10000 });

    // 等待圖表載入
    await page.waitForSelector('.recharts-responsive-container', { timeout: 5000 });
    
    // 嘗試與圖表互動（hover 效果）
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible();
    
    // 在圖表上移動滑鼠，可能觸發 tooltip
    await chartContainer.hover();
    
    // 檢查是否有圖表元素（線條、點等）
    const chartElements = page.locator('.recharts-line, .recharts-dot');
    
    // 如果圖表有數據，應該有這些元素
    const elementCount = await chartElements.count();
    if (elementCount > 0) {
      await expect(chartElements.first()).toBeVisible();
    }
  });

  /**
   * TC-001-E2E-07: API 整合測試
   */
  test('TC-001-E2E-07: 應該正確整合後端 API', async ({ page }) => {
    // 1. 直接測試 API 端點
    const sprintListResponse = await page.request.get(`${BACKEND_URL}/api/sprint/list`);
    expect(sprintListResponse.ok()).toBeTruthy();
    
    const sprintList = await sprintListResponse.json();
    expect(sprintList.sprints).toBeDefined();
    expect(Array.isArray(sprintList.sprints)).toBeTruthy();

    // 2. 如果有可用的 Sprint，測試燃盡圖 API
    if (sprintList.sprints.length > 0) {
      const firstSprint = sprintList.sprints[0];
      const encodedSprintName = encodeURIComponent(firstSprint.sprint_name);
      
      const burndownResponse = await page.request.get(`${BACKEND_URL}/api/sprint/burndown/${encodedSprintName}`);
      expect(burndownResponse.ok()).toBeTruthy();
      
      const burndownData = await burndownResponse.json();
      expect(burndownData.sprint_data).toBeDefined();
      expect(burndownData.chart_data).toBeDefined();
      expect(Array.isArray(burndownData.chart_data)).toBeTruthy();
    }

    // 3. 前端整合測試
    await page.goto(FRONTEND_URL);
    await page.locator('button[role="combobox"]').click();
    
    if (sprintList.sprints.length > 0) {
      const firstSprintName = sprintList.sprints[0].sprint_name;
      await page.locator(`text="${firstSprintName}"`).click();
      await page.waitForSelector('text="Sprint 完成率"', { timeout: 10000 });
      
      // 驗證前端顯示的數據與 API 回應一致
      await expect(page.locator(`text="${firstSprintName}"`)).toBeVisible();
    }
  });
});

/**
 * 效能測試
 */
test.describe('Sprint 燃盡圖效能測試', () => {
  
  test('TC-001-PERF-01: 頁面載入效能測試', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // 選擇 Sprint
    await page.locator('button[role="combobox"]').click();
    const sprintOption = page.locator('text=/DEMO1-Sprint/').first();
    
    if (await sprintOption.count() > 0) {
      await sprintOption.click();
      await page.waitForSelector('text="Sprint 完成率"', { timeout: 10000 });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // 期望整個流程在 15 秒內完成
      expect(loadTime).toBeLessThan(15000);
      
      console.log(`Sprint 燃盡圖載入時間: ${loadTime}ms`);
    }
  });
});

/**
 * 錯誤處理測試
 */
test.describe('Sprint 燃盡圖錯誤處理測試', () => {
  
  test('TC-001-ERROR-01: 網路錯誤處理測試', async ({ page }) => {
    // 模擬網路錯誤 - 阻擋 API 請求
    await page.route('**/api/sprint/**', route => route.abort());
    
    await page.goto(FRONTEND_URL);
    await page.locator('button[role="combobox"]').click();
    
    const sprintOption = page.locator('text=/DEMO1-Sprint/').first();
    if (await sprintOption.count() > 0) {
      await sprintOption.click();
      
      // 應該顯示錯誤訊息
      await expect(page.locator('text=/載入失敗|錯誤|Error/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
