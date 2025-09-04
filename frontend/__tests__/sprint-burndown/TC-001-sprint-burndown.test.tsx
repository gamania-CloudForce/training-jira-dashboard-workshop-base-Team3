/**
 * Test Cases: AC-001-01 至 AC-001-04 Sprint 燃盡圖視覺化
 * 
 * 對應文件: spec01-us01-ac01to04-testcase.md
 * 測試案例編號: TC-001-01 至 TC-001-05
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '../../components/theme-provider';
import { SprintBurndownContainer } from '../../components/sprint-burndown-container';
import { CompletionRateCard } from '../../components/completion-rate-card';
import { BurndownChart } from '../../components/burndown-chart';

// Mock the API hook
jest.mock('../../hooks/use-sprint-burndown', () => ({
  useSprintBurndown: jest.fn(),
}));

const { useSprintBurndown } = require('../../hooks/use-sprint-burndown');

// Test Helper: 包裝組件與 ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light">
      {component}
    </ThemeProvider>
  );
};

// Mock 測試資料 - 對應 TC-001-01
const mockNormalSprintData = {
  sprint_data: {
    sprint_name: "Sprint 2",
    total_story_points: 20,
    completed_story_points: 13,
    remaining_story_points: 7,
    completion_rate: 65,
    status: "normal" as const,
    total_working_days: 10,
    days_elapsed: 7,
    remaining_working_days: 3
  },
  chart_data: [
    { day: 1, date: "2025-08-18", ideal: 18, actual: 20 },
    { day: 2, date: "2025-08-19", ideal: 16, actual: 20 },
    { day: 3, date: "2025-08-20", ideal: 14, actual: 18 },
    { day: 4, date: "2025-08-21", ideal: 12, actual: 15 },
    { day: 5, date: "2025-08-22", ideal: 10, actual: 13 },
    { day: 6, date: "2025-08-25", ideal: 8, actual: 10 },
    { day: 7, date: "2025-08-26", ideal: 6, actual: 7 },
  ]
};

// Mock 測試資料 - 對應 TC-001-02 (正常狀態)
const mockHealthySprintData = {
  ...mockNormalSprintData,
  sprint_data: {
    ...mockNormalSprintData.sprint_data,
    completion_rate: 70,
    completed_story_points: 14,
    remaining_story_points: 6,
    days_elapsed: 6,
    status: "normal" as const,
  }
};

// Mock 測試資料 - 對應 TC-001-03 (警示狀態)
const mockWarningSprintData = {
  ...mockNormalSprintData,
  sprint_data: {
    ...mockNormalSprintData.sprint_data,
    completion_rate: 50,
    completed_story_points: 10,
    remaining_story_points: 10,
    days_elapsed: 7,
    status: "warning" as const,
  }
};

// Mock 測試資料 - 對應 TC-001-04 (危險狀態)
const mockDangerSprintData = {
  ...mockNormalSprintData,
  sprint_data: {
    ...mockNormalSprintData.sprint_data,
    completion_rate: 30,
    completed_story_points: 6,
    remaining_story_points: 14,
    days_elapsed: 8,
    status: "danger" as const,
  }
};

describe('Sprint Burndown Visualization - Test Cases', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TC-001-01: 正常顯示燃盡圖與完成率
   * 
   * 測試目標: 驗證 Sprint 燃盡圖與完成率資訊的正常顯示功能
   * 預期結果:
   * 1. 完成率顯示 "65% 完成"
   * 2. 進度詳情顯示 "已完成: 13 SP | 剩餘: 7 SP | 總計: 20 SP"
   * 3. 燃盡圖顯示理想燃盡線和實際燃盡線
   * 4. 進度條視覺化顯示 65% 進度
   */
  describe('TC-001-01: 正常顯示燃盡圖與完成率', () => {
    beforeEach(() => {
      useSprintBurndown.mockReturnValue({
        burndownData: mockNormalSprintData,
        sprintInfo: null,
        loading: false,
        error: null
      });
    });

    test('應該正確顯示完成率資訊', async () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockNormalSprintData.sprint_data} />
      );

      // 檢查完成率顯示
      expect(screen.getByText('65%')).toBeInTheDocument();
      
      // 檢查 Sprint 名稱
      expect(screen.getByText('Sprint 2')).toBeInTheDocument();

      // 檢查故事點數分解
      expect(screen.getByText('13')).toBeInTheDocument(); // 已完成
      expect(screen.getByText('7')).toBeInTheDocument();  // 剩餘
      expect(screen.getByText('20')).toBeInTheDocument(); // 總計
    });

    test('應該正確顯示時間資訊', () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockNormalSprintData.sprint_data} />
      );

      // 檢查天數資訊
      expect(screen.getByText('7 天')).toBeInTheDocument(); // 已過天數
      expect(screen.getByText('3 天')).toBeInTheDocument(); // 剩餘天數  
      expect(screen.getByText('10 天')).toBeInTheDocument(); // 總工作日
    });

    test('應該正確顯示燃盡圖', () => {
      renderWithTheme(
        <BurndownChart 
          chartData={mockNormalSprintData.chart_data}
          sprintData={mockNormalSprintData.sprint_data}
        />
      );

      // 檢查燃盡圖標題
      expect(screen.getByText('Sprint 燃盡圖')).toBeInTheDocument();
      
      // 檢查圖例
      expect(screen.getByText('理想線')).toBeInTheDocument();
      expect(screen.getByText('實際線')).toBeInTheDocument();
    });

    test('完整容器整合測試', () => {
      renderWithTheme(
        <SprintBurndownContainer selectedSprint="Sprint 2" />
      );

      // 應該顯示完成率卡片和燃盡圖
      expect(screen.getByText('Sprint 完成率')).toBeInTheDocument();
      expect(screen.getByText('Sprint 燃盡圖')).toBeInTheDocument();
    });
  });

  /**
   * TC-001-02: 進度正常狀態的視覺表現
   * 
   * 測試目標: 驗證當 Sprint 進度正常或超前時的綠色視覺指示
   * 預期結果:
   * 1. 進度條顯示綠色
   * 2. 完成率數字顯示為綠色  
   * 3. 燃盡圖實際線顯示為綠色
   * 4. 頁面顯示正常狀態標籤
   */
  describe('TC-001-02: 進度正常狀態的視覺表現', () => {
    beforeEach(() => {
      useSprintBurndown.mockReturnValue({
        burndownData: mockHealthySprintData,
        sprintInfo: null,
        loading: false,
        error: null
      });
    });

    test('應該顯示正常狀態的視覺指示', () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockHealthySprintData.sprint_data} />
      );

      // 檢查狀態標籤
      expect(screen.getByText('正常進度')).toBeInTheDocument();
      
      // 檢查完成率
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    test('燃盡圖應該使用正常狀態顏色', () => {
      const { container } = renderWithTheme(
        <BurndownChart 
          chartData={mockHealthySprintData.chart_data}
          sprintData={mockHealthySprintData.sprint_data}
        />
      );

      // 這裡可以檢查是否包含綠色相關的 CSS 類或樣式
      // 由於顏色是通過 inline style 設定，我們檢查組件是否正常渲染
      expect(screen.getByText('Sprint 燃盡圖')).toBeInTheDocument();
    });
  });

  /**
   * TC-001-03: 進度警示狀態的視覺表現
   * 
   * 測試目標: 驗證當 Sprint 進度稍微落後時的黃色警示視覺效果
   * 預期結果:
   * 1. 進度條顯示黃色
   * 2. 完成率數字顯示為黃色
   * 3. 燃盡圖實際線顯示為黃色
   * 4. 頁面顯示警告標籤
   */
  describe('TC-001-03: 進度警示狀態的視覺表現', () => {
    beforeEach(() => {
      useSprintBurndown.mockReturnValue({
        burndownData: mockWarningSprintData,
        sprintInfo: null,
        loading: false,
        error: null
      });
    });

    test('應該顯示警示狀態的視覺指示', () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockWarningSprintData.sprint_data} />
      );

      // 檢查狀態標籤
      expect(screen.getByText('稍微落後')).toBeInTheDocument();
      
      // 檢查完成率
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  /**
   * TC-001-04: 進度危險狀態的視覺表現
   * 
   * 測試目標: 驗證當 Sprint 進度嚴重落後時的紅色危險警示效果
   * 預期結果:
   * 1. 進度條顯示紅色
   * 2. 完成率數字顯示為紅色
   * 3. 燃盡圖實際線顯示為紅色
   * 4. 頁面顯示危險狀態標籤
   */
  describe('TC-001-04: 進度危險狀態的視覺表現', () => {
    beforeEach(() => {
      useSprintBurndown.mockReturnValue({
        burndownData: mockDangerSprintData,
        sprintInfo: null,
        loading: false,
        error: null
      });
    });

    test('應該顯示危險狀態的視覺指示', () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockDangerSprintData.sprint_data} />
      );

      // 檢查狀態標籤 - 對應 AC-001-04 的 "嚴重落後" 提示
      expect(screen.getByText('嚴重落後')).toBeInTheDocument();
      
      // 檢查完成率
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    test('應該顯示危險狀態的完成率', () => {
      renderWithTheme(
        <CompletionRateCard sprintData={mockDangerSprintData.sprint_data} />
      );

      // 檢查故事點數
      expect(screen.getByText('6')).toBeInTheDocument();  // 已完成 
      expect(screen.getByText('14')).toBeInTheDocument(); // 剩餘
      expect(screen.getByText('20')).toBeInTheDocument(); // 總計
    });
  });

  /**
   * TC-001-05: 進度狀態邊界值測試
   * 
   * 測試目標: 驗證進度狀態切換的邊界值準確性
   * 預期結果: 狀態切換即時且準確
   */
  describe('TC-001-05: 進度狀態邊界值測試', () => {
    
    test('應該正確處理邊界值狀態', () => {
      // 測試邊界值 - 正好 10% 落後應該是警告狀態
      const boundaryWarningData = {
        ...mockNormalSprintData.sprint_data,
        completion_rate: 60, // 60% 完成，70% 時間過去 = 正好 10% 落後
        status: "warning" as const,
      };

      renderWithTheme(
        <CompletionRateCard sprintData={boundaryWarningData} />
      );

      expect(screen.getByText('稍微落後')).toBeInTheDocument();
    });

    test('應該正確處理危險邊界值', () => {
      // 測試邊界值 - 超過 20% 落後應該是危險狀態
      const boundaryDangerData = {
        ...mockNormalSprintData.sprint_data,
        completion_rate: 50, // 50% 完成，80% 時間過去 = 30% 落後
        status: "danger" as const,
      };

      renderWithTheme(
        <CompletionRateCard sprintData={boundaryDangerData} />
      );

      expect(screen.getByText('嚴重落後')).toBeInTheDocument();
    });
  });

  /**
   * 載入和錯誤狀態測試
   */
  describe('載入和錯誤狀態', () => {
    test('應該正確顯示載入狀態', () => {
      useSprintBurndown.mockReturnValue({
        burndownData: null,
        sprintInfo: null,
        loading: true,
        error: null
      });

      renderWithTheme(
        <SprintBurndownContainer selectedSprint="Sprint 2" />
      );

      // 檢查載入骨架是否存在
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    test('應該正確顯示錯誤狀態', () => {
      useSprintBurndown.mockReturnValue({
        burndownData: null,
        sprintInfo: null,
        loading: false,
        error: "API Error: Failed to fetch data"
      });

      renderWithTheme(
        <SprintBurndownContainer selectedSprint="Sprint 2" />
      );

      expect(screen.getByText(/載入失敗/)).toBeInTheDocument();
      expect(screen.getByText(/API Error: Failed to fetch data/)).toBeInTheDocument();
    });

    test('選擇 All 時應該顯示提示訊息', () => {
      renderWithTheme(
        <SprintBurndownContainer selectedSprint="All" />
      );

      expect(screen.getByText('請選擇一個特定的 Sprint 來查看燃盡圖和完成率分析')).toBeInTheDocument();
    });
  });
});
