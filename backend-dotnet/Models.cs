using System.Text.Json.Serialization;

namespace JiraDashboard.Models;

// Represents information about a single column in the table
public record ColumnInfo(string Name, string Type);

// Represents the response for the /api/table/summary endpoint
public record TableSummary(
    string SheetId,
    string SheetName,
    int TotalRows,
    int TotalColumns,
    List<ColumnInfo> Columns,
    DateTime LastUpdated
);

// Represents pagination information for the data table
public record PaginationInfo(
    int CurrentPage,
    int PageSize,
    int TotalPages,
    int TotalRecords,
    bool HasNext,
    bool HasPrev
);

// Represents the main response for the /api/table/data endpoint
public record TableDataResponse(
    [property: JsonPropertyName("data")] List<Dictionary<string, object?>> Data,
    [property: JsonPropertyName("pagination")] PaginationInfo Pagination
);

// Dashboard MVP Models
public record DashboardStats(
    [property: JsonPropertyName("total_issues")] int TotalIssues,
    [property: JsonPropertyName("total_story_points")] double TotalStoryPoints,
    [property: JsonPropertyName("done_issues")] int DoneIssues,
    [property: JsonPropertyName("done_story_points")] double DoneStoryPoints,
    [property: JsonPropertyName("last_updated")] DateTime LastUpdated
);

public record StatusDistributionItem(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("count")] int Count,
    [property: JsonPropertyName("percentage")] double Percentage
);

public record StatusDistribution(
    [property: JsonPropertyName("distribution")] List<StatusDistributionItem> Distribution,
    [property: JsonPropertyName("total_count")] int TotalCount,
    [property: JsonPropertyName("last_updated")] DateTime LastUpdated
);

// Configuration Models
public record UpdateSheetConfigRequest(
    [property: JsonPropertyName("google_sheet_url")] string GoogleSheetUrl
);

public record UpdateSheetConfigResponse(
    [property: JsonPropertyName("success")] bool Success,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("sheet_id")] string? SheetId
);

public record SheetConfigInfo(
    [property: JsonPropertyName("sheet_id")] string SheetId,
    [property: JsonPropertyName("sheet_url")] string SheetUrl
);

// Sprint Burndown Models
public record SprintBurndownData(
    [property: JsonPropertyName("sprint_name")] string SprintName,
    [property: JsonPropertyName("total_story_points")] double TotalStoryPoints,
    [property: JsonPropertyName("completed_story_points")] double CompletedStoryPoints,
    [property: JsonPropertyName("remaining_story_points")] double RemainingStoryPoints,
    [property: JsonPropertyName("completion_rate")] double CompletionRate,
    [property: JsonPropertyName("status")] string Status, // 'normal', 'warning', 'danger'
    [property: JsonPropertyName("total_working_days")] int TotalWorkingDays,
    [property: JsonPropertyName("days_elapsed")] int DaysElapsed,
    [property: JsonPropertyName("remaining_working_days")] int RemainingWorkingDays
);

public record DayProgress(
    [property: JsonPropertyName("day")] int Day,
    [property: JsonPropertyName("date")] string Date,
    [property: JsonPropertyName("ideal_remaining")] double IdealRemaining,
    [property: JsonPropertyName("actual_remaining")] double? ActualRemaining,
    [property: JsonPropertyName("is_working_day")] bool IsWorkingDay
);

public record SprintBurndownResponse(
    [property: JsonPropertyName("sprint_data")] SprintBurndownData SprintData,
    [property: JsonPropertyName("daily_progress")] List<DayProgress> DailyProgress,
    [property: JsonPropertyName("chart_data")] List<Dictionary<string, object>> ChartData
);

public record SprintInfo(
    [property: JsonPropertyName("sprint_name")] string SprintName,
    [property: JsonPropertyName("sprint_id")] int SprintId,
    [property: JsonPropertyName("board_name")] string BoardName,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("start_date")] DateTime? StartDate,
    [property: JsonPropertyName("end_date")] DateTime? EndDate,
    [property: JsonPropertyName("complete_date")] DateTime? CompleteDate,
    [property: JsonPropertyName("goal")] string Goal
);

// Overdue Issues Models
public record OverdueIssue(
    [property: JsonPropertyName("key")] string Key,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("priority")] string Priority,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("created")] DateTime Created,
    [property: JsonPropertyName("days_elapsed")] int DaysElapsed,
    [property: JsonPropertyName("days_limit")] int DaysLimit,
    [property: JsonPropertyName("days_overdue")] int DaysOverdue,
    [property: JsonPropertyName("project")] string Project,
    [property: JsonPropertyName("assignee")] string? Assignee
);

public record OverdueIssuesResponse(
    [property: JsonPropertyName("overdue_issues")] List<OverdueIssue> OverdueIssues,
    [property: JsonPropertyName("total_count")] int TotalCount,
    [property: JsonPropertyName("priority_limits")] Dictionary<string, int> PriorityLimits,
    [property: JsonPropertyName("last_updated")] DateTime LastUpdated
);
