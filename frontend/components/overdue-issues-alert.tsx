import React from "react";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface OverdueIssue {
  key: string;
  summary: string;
  priority: string;
  status: string;
  created: string;
  days_elapsed: number;
  days_limit: number;
  days_overdue: number;
  project: string;
  assignee?: string;
}

export interface OverdueIssuesData {
  overdue_issues: OverdueIssue[];
  total_count: number;
  priority_limits: Record<string, number>;
  last_updated: string;
}

interface OverdueIssuesAlertProps {
  data?: OverdueIssuesData;
  loading?: boolean;
  error?: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'highest':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'lowest':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getOverdueColor = (daysOverdue: number) => {
  if (daysOverdue >= 14) return 'text-red-600';
  if (daysOverdue >= 7) return 'text-orange-600';
  if (daysOverdue >= 3) return 'text-yellow-600';
  return 'text-gray-600';
};

export function OverdueIssuesAlert({ data, loading, error }: OverdueIssuesAlertProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            超時 Issue 警示
          </CardTitle>
          <CardDescription>檢查未完成且超過預期處理時間的 Issue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>載入中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            超時 Issue 警示
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-600">
              載入失敗: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total_count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            超時 Issue 警示
          </CardTitle>
          <CardDescription>檢查未完成且超過預期處理時間的 Issue</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-600">
              ✅ 目前沒有超時的 Issue
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          超時 Issue 警示
          <Badge variant="destructive" className="ml-2">
            {data.total_count} 個超時
          </Badge>
        </CardTitle>
        <CardDescription>
          檢查未完成且超過預期處理時間的 Issue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Priority Limits Information */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Priority 處理時限規則:</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(data.priority_limits).map(([priority, days]) => (
                <span key={priority} className={`px-2 py-1 rounded border ${getPriorityColor(priority)}`}>
                  {priority}: {days}天
                </span>
              ))}
            </div>
          </div>

          {/* Overdue Issues List */}
          <div className="space-y-3">
            {data.overdue_issues.map((issue) => (
              <Alert key={issue.key} className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{issue.key}</span>
                        <Badge className={getPriorityColor(issue.priority)}>
                          {issue.priority}
                        </Badge>
                        <Badge variant="outline">{issue.status}</Badge>
                      </div>
                      <span className={`text-sm font-medium ${getOverdueColor(issue.days_overdue)}`}>
                        超時 {issue.days_overdue} 天
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {issue.summary}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>建立時間: {new Date(issue.created).toLocaleDateString()}</span>
                      <span>已過 {issue.days_elapsed} 天</span>
                      <span>時限: {issue.days_limit} 天</span>
                      {issue.project && <span>專案: {issue.project}</span>}
                      {issue.assignee && <span>負責人: {issue.assignee}</span>}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
