"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BarChart3 } from "lucide-react"
import { useSprintBurndown } from "@/hooks/use-sprint-burndown"
import { CompletionRateCard } from "./completion-rate-card"
import { BurndownChart } from "./burndown-chart"

interface SprintBurndownContainerProps {
  selectedSprint: string
  className?: string
}

export function SprintBurndownContainer({ 
  selectedSprint, 
  className 
}: SprintBurndownContainerProps) {
  const { burndownData, sprintInfo, loading, error } = useSprintBurndown({
    sprintName: selectedSprint === 'All' ? undefined : selectedSprint
  })

  // 如果選擇 "All" 或未選擇 Sprint，顯示提示
  if (!selectedSprint || selectedSprint === 'All') {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sprint 燃盡圖</h3>
            <p className="text-muted-foreground text-center max-w-md">
              請選擇一個特定的 Sprint 來查看燃盡圖和完成率分析
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <LoadingSkeleton />
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>載入失敗:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 無資料狀態
  if (!burndownData) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">無可用資料</h3>
            <p className="text-muted-foreground text-center max-w-md">
              目前選擇的 Sprint &quot;{selectedSprint}&quot; 沒有可用的燃盡圖資料
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 正常顯示
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 完成率卡片 */}
      <CompletionRateCard sprintData={burndownData.sprint_data} />
      
      {/* 燃盡圖 */}
      <BurndownChart 
        chartData={burndownData.chart_data}
        sprintData={burndownData.sprint_data}
      />
    </div>
  )
}

// 載入骨架組件
function LoadingSkeleton() {
  return (
    <>
      {/* 完成率卡片骨架 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 燃盡圖骨架 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-[300px] w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
