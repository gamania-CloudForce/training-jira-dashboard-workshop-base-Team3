using System.Globalization;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;
using JiraDashboard.Models;

namespace JiraDashboard.Services;

public class GoogleSheetsService
{
    private readonly HttpClient _httpClient;
    private string _sheetId; // 改為可變更
    //private readonly string _sheetName;
    private readonly string _sheetRawData;
    private readonly string _sheetRawStatusTime;
    private readonly string _sheetSprintInfo;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);
    private List<Dictionary<string, object?>>? _cache;
    private DateTime _cacheTimestamp;
    private List<string>? _sprintCache;
    private DateTime _sprintCacheTimestamp;
    private List<string>? _projectCache;
    private DateTime _projectCacheTimestamp;

    public GoogleSheetsService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        var defaultSheetId = configuration["GoogleSheets:SheetId"] ?? throw new InvalidOperationException("SheetId not configured");
        
        // 從檔案載入持久化的 Sheet ID，如果沒有則使用預設值
        _sheetId = LoadSheetIdFromFile(defaultSheetId);
        
        //_sheetName = configuration["GoogleSheets:Sheet_rawData"] ?? throw new InvalidOperationException("Sheet_rawData not configured");
        _sheetRawData = configuration["GoogleSheets:Sheet_rawData"] ?? throw new InvalidOperationException("Sheet_rawData not configured");
        _sheetRawStatusTime = configuration["GoogleSheets:Sheet_rawStatusTime"] ?? throw new InvalidOperationException("Sheet_rawStatusTime not configured");
        _sheetSprintInfo = configuration["GoogleSheets:Sheet_sprintInfo"] ?? throw new InvalidOperationException("Sheet_sprintInfo not configured");
    }

    private string GetCsvUrl() => $"https://docs.google.com/spreadsheets/d/{_sheetId}/gviz/tq?tqx=out:csv&sheet={_sheetRawData}&range=A:W";
    
    private string GetSprintCsvUrl() => $"https://docs.google.com/spreadsheets/d/{_sheetId}/gviz/tq?tqx=out:csv&sheet={_sheetSprintInfo}&range=C:C";

    private async Task<List<Dictionary<string, object?>>> FetchAndCacheDataAsync()
    {
        if (_cache != null && DateTime.UtcNow - _cacheTimestamp < _cacheDuration)
        {
            return _cache;
        }

        var url = GetCsvUrl();
        using var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            PrepareHeaderForMatch = args => args.Header.ToLower().Replace(" ", "_").Replace(".", "_")
        });

        var records = new List<Dictionary<string, object?>>();
        await foreach (var record in csv.GetRecordsAsync<dynamic>())
        {
            records.Add(new Dictionary<string, object?>(record));
        }

        _cache = records;
        _cacheTimestamp = DateTime.UtcNow;
        return _cache;
    }

    private async Task<List<string>> FetchAndCacheSprintDataAsync()
    {
        if (_sprintCache != null && DateTime.UtcNow - _sprintCacheTimestamp < _cacheDuration)
        {
            return _sprintCache;
        }

        var url = GetSprintCsvUrl();
        using var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture));

        var sprints = new List<string> { "All" }; // 預設第一個選項
        
        await foreach (var record in csv.GetRecordsAsync<dynamic>())
        {
            var sprintDict = new Dictionary<string, object?>(record);
            var sprintValue = sprintDict.Values.FirstOrDefault()?.ToString()?.Trim();
            
            if (!string.IsNullOrEmpty(sprintValue) && 
                sprintValue != "N/A" && 
                sprintValue != "Sprint Name" && // 跳過表頭
                !sprints.Contains(sprintValue))
            {
                sprints.Add(sprintValue);
            }
        }
        
        // 排序（除了 "All"）
        var sortedSprints = sprints.Skip(1).OrderBy(s => s).ToList();
        sprints = new List<string> { "All" };
        sprints.AddRange(sortedSprints);
        sprints.Add("No Sprints");

        _sprintCache = sprints;
        _sprintCacheTimestamp = DateTime.UtcNow;
        return _sprintCache;
    }

    public async Task<TableSummary> GetSummaryAsync()
    {
        var data = await FetchAndCacheDataAsync();
        var firstRecord = data.FirstOrDefault();
        var columns = firstRecord?.Keys.Select(key => new ColumnInfo(key, "string")).ToList() ?? new List<ColumnInfo>();

        return new TableSummary(
            SheetId: _sheetId,
            SheetName: _sheetRawData,
            TotalRows: data.Count,
            TotalColumns: columns.Count,
            Columns: columns,
            LastUpdated: _cacheTimestamp
        );
    }

    public async Task<TableDataResponse> GetPaginatedDataAsync(
        int page, int pageSize, string sortBy, string sortOrder, string? sprintFilter = null)
    {
        var allData = await FetchAndCacheDataAsync();

        // Apply sprint filter first
        var filteredData = ApplySprintFilter(allData, sprintFilter);

        // Sorting
        if (!string.IsNullOrEmpty(sortBy) && filteredData.Any() && filteredData.First().ContainsKey(sortBy))
        {
            var orderedData = sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase) 
                ? filteredData.OrderByDescending(r => r[sortBy]) 
                : filteredData.OrderBy(r => r[sortBy]);
            filteredData = orderedData.ToList();
        }

        // Pagination
        var totalRecords = filteredData.Count;
        var totalPages = (int)Math.Ceiling(totalRecords / (double)pageSize);
        var paginatedData = filteredData.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var paginationInfo = new PaginationInfo(
            CurrentPage: page,
            PageSize: pageSize,
            TotalPages: totalPages,
            TotalRecords: totalRecords,
            HasNext: page < totalPages,
            HasPrev: page > 1
        );


        return new TableDataResponse(
            Data: paginatedData,
            Pagination: paginationInfo
        );
    }

    public async Task<List<string>> GetSprintOptionsAsync()
    {
        return await FetchAndCacheSprintDataAsync();
    }

    public async Task<List<string>> GetProjectOptionsAsync()
    {
        return await FetchAndCacheProjectDataAsync();
    }

    private async Task<List<string>> FetchAndCacheProjectDataAsync()
    {
        if (_projectCache != null && DateTime.UtcNow - _projectCacheTimestamp < _cacheDuration)
        {
            return _projectCache;
        }

        var data = await FetchAndCacheDataAsync();
        var projects = new List<string> { "All" }; // 預設第一個選項

        // 從 rawData 中提取 Projects 欄位的唯一值
        var projectKeys = new[] { "projects", "Projects", "project", "Project" };
        string? projectColumn = null;

        // 找到 Projects 欄位
        if (data.Any())
        {
            var firstRow = data.First();
            foreach (var key in projectKeys)
            {
                if (firstRow.ContainsKey(key))
                {
                    projectColumn = key;
                    break;
                }
            }
        }

        if (!string.IsNullOrEmpty(projectColumn))
        {
            var uniqueProjects = data
                .Where(row => row.ContainsKey(projectColumn) && row[projectColumn] != null)
                .Select(row => row[projectColumn]?.ToString()?.Trim())
                .Where(project => !string.IsNullOrEmpty(project) && project != "N/A")
                .Distinct()
                .OrderBy(p => p)
                .ToList();

            projects.AddRange(uniqueProjects);
        }

        _projectCache = projects;
        _projectCacheTimestamp = DateTime.UtcNow;
        return _projectCache;
    }

    public async Task<DashboardStats> GetDashboardStatsAsync(string? sprintFilter = null, string? projectFilter = null)
    {
        var allData = await FetchAndCacheDataAsync();
        var filteredData = ApplyFilters(allData, sprintFilter, projectFilter);

        var totalIssues = filteredData.Count;
        
        // 尋找 Story Points 欄位
        var storyPointsColumn = FindStoryPointsColumn(filteredData);
        var totalStoryPoints = CalculateTotalStoryPoints(filteredData, storyPointsColumn);

        // 計算已完成的 Issues
        var doneData = filteredData.Where(row => IsDoneStatus(row)).ToList();
        var doneIssues = doneData.Count;
        var doneStoryPoints = CalculateTotalStoryPoints(doneData, storyPointsColumn);

        return new DashboardStats(
            TotalIssues: totalIssues,
            TotalStoryPoints: totalStoryPoints,
            DoneIssues: doneIssues,
            DoneStoryPoints: doneStoryPoints,
            LastUpdated: _cacheTimestamp
        );
    }

    public async Task<StatusDistribution> GetStatusDistributionAsync(string? sprintFilter = null, string? projectFilter = null)
    {
        var allData = await FetchAndCacheDataAsync();
        var filteredData = ApplyFilters(allData, sprintFilter, projectFilter);

        var totalCount = filteredData.Count;
        var statusCounts = new Dictionary<string, int>();

        // 計算各狀態的數量
        foreach (var row in filteredData)
        {
            var status = GetStatusValue(row);
            if (!string.IsNullOrEmpty(status))
            {
                statusCounts[status] = statusCounts.GetValueOrDefault(status, 0) + 1;
            }
        }

        // 定義狀態顯示順序
        var statusOrder = new List<string>
        {
            "Backlog", "Evaluated", "To Do", "In Progress", "Waiting",
            "Dev Completed", "Ready to Verify", "Testing", "Ready to Release",
            "Done", "Invalid", "Routine"
        };

        var distribution = new List<StatusDistributionItem>();

        // 按照指定順序排列狀態
        foreach (var status in statusOrder)
        {
            if (statusCounts.TryGetValue(status, out var count))
            {
                var percentage = totalCount > 0 ? Math.Round((double)count / totalCount * 100, 1) : 0;
                distribution.Add(new StatusDistributionItem(
                    Status: status,
                    Count: count,
                    Percentage: percentage
                ));
            }
        }

        // 處理未在預定義列表中的其他狀態
        foreach (var kvp in statusCounts)
        {
            if (!statusOrder.Contains(kvp.Key))
            {
                var percentage = totalCount > 0 ? Math.Round((double)kvp.Value / totalCount * 100, 1) : 0;
                distribution.Add(new StatusDistributionItem(
                    Status: kvp.Key,
                    Count: kvp.Value,
                    Percentage: percentage
                ));
            }
        }

        return new StatusDistribution(
            Distribution: distribution,
            TotalCount: totalCount,
            LastUpdated: _cacheTimestamp
        );
    }

    private static string? FindStoryPointsColumn(List<Dictionary<string, object?>> data)
    {
        if (!data.Any()) return null;
        
        var firstRow = data.First();
        foreach (var key in firstRow.Keys)
        {
            var keyLower = key.ToLower();
            if (keyLower.Contains("story") && keyLower.Contains("point"))
            {
                return key;
            }
        }
        return null;
    }

    private static double CalculateTotalStoryPoints(List<Dictionary<string, object?>> data, string? storyPointsColumn)
    {
        if (string.IsNullOrEmpty(storyPointsColumn)) return 0;

        double total = 0;
        foreach (var row in data)
        {
            if (row.TryGetValue(storyPointsColumn, out var value) && value != null)
            {
                if (double.TryParse(value.ToString(), out var points))
                {
                    total += points;
                }
            }
        }
        return total;
    }

    private static bool IsDoneStatus(Dictionary<string, object?> row)
    {
        var status = GetStatusValue(row);
        if (string.IsNullOrEmpty(status)) return false;
        
        var statusLower = status.ToLower();
        return statusLower.Contains("done") || statusLower.Contains("resolved") || statusLower.Contains("closed");
    }

    private static string GetStatusValue(Dictionary<string, object?> row)
    {
        // 嘗試不同的狀態欄位名稱
        var statusKeys = new[] { "status", "Status", "issue_status", "Issue_Status" };
        
        foreach (var key in statusKeys)
        {
            if (row.TryGetValue(key, out var value) && value != null)
            {
                return value.ToString()?.Trim() ?? "";
            }
        }
        return "";
    }

    private static double ParseStoryPoints(Dictionary<string, object?> row, string storyPointsColumn)
    {
        if (string.IsNullOrEmpty(storyPointsColumn)) return 0;

        if (row.TryGetValue(storyPointsColumn, out var value) && value != null)
        {
            if (double.TryParse(value.ToString(), out var points))
            {
                return points;
            }
        }
        return 0;
    }

    private static List<Dictionary<string, object?>> ApplySprintFilter(List<Dictionary<string, object?>> data, string? sprintFilter)
    {
        if (string.IsNullOrEmpty(sprintFilter) || sprintFilter == "All")
        {
            return data;
        }

        if (sprintFilter == "No Sprints")
        {
            return data.Where(row => 
            {
                if (!row.ContainsKey("sprint")) return true;
                var sprintValue = row["sprint"]?.ToString()?.Trim();
                return string.IsNullOrEmpty(sprintValue);
            }).ToList();
        }

        return data.Where(row => 
        {
            if (!row.ContainsKey("sprint")) return false;
            var sprintValue = row["sprint"]?.ToString()?.Trim();
            return sprintValue == sprintFilter;
        }).ToList();
    }

    private static List<Dictionary<string, object?>> ApplyProjectFilter(List<Dictionary<string, object?>> data, string? projectFilter)
    {
        if (string.IsNullOrEmpty(projectFilter) || projectFilter == "All")
        {
            return data;
        }

        var projectKeys = new[] { "projects", "Projects", "project", "Project" };
        string? projectColumn = null;

        // 找到 Projects 欄位
        if (data.Any())
        {
            var firstRow = data.First();
            foreach (var key in projectKeys)
            {
                if (firstRow.ContainsKey(key))
                {
                    projectColumn = key;
                    break;
                }
            }
        }

        if (string.IsNullOrEmpty(projectColumn))
        {
            return data; // 如果找不到專案欄位，返回所有資料
        }

        return data.Where(row =>
        {
            if (!row.ContainsKey(projectColumn)) return false;
            var projectValue = row[projectColumn]?.ToString()?.Trim();
            return projectValue == projectFilter;
        }).ToList();
    }

    private static List<Dictionary<string, object?>> ApplyFilters(List<Dictionary<string, object?>> data, string? sprintFilter, string? projectFilter)
    {
        var filteredData = ApplySprintFilter(data, sprintFilter);
        filteredData = ApplyProjectFilter(filteredData, projectFilter);
        return filteredData;
    }

    public static string? ExtractSheetIdFromUrl(string googleSheetUrl)
    {
        if (string.IsNullOrWhiteSpace(googleSheetUrl))
            return null;

        // Google Sheets URL patterns:
        // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
        // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?usp=sharing
        // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
        // https://docs.google.com/spreadsheets/d/{SHEET_ID}
        var pattern = @"https://docs\.google\.com/spreadsheets/d/([a-zA-Z0-9-_]+)";
        var match = Regex.Match(googleSheetUrl, pattern);
        
        return match.Success ? match.Groups[1].Value : null;
    }

    public string GetCurrentSheetId() => _sheetId;

    public string GetSheetUrl() => $"https://docs.google.com/spreadsheets/d/{_sheetId}";

    public void UpdateSheetId(string newSheetId)
    {
        if (string.IsNullOrWhiteSpace(newSheetId))
            throw new ArgumentException("Sheet ID cannot be null or empty", nameof(newSheetId));

        _sheetId = newSheetId;
        ClearCache();
        
        // 持久化到檔案
        SaveSheetIdToFile(newSheetId);
    }

    private void SaveSheetIdToFile(string sheetId)
    {
        try
        {
            var configPath = "/app/current_sheet_id.txt";
            File.WriteAllText(configPath, sheetId);
        }
        catch (Exception ex)
        {
            // 記錄錯誤但不中斷服務
            Console.WriteLine($"Warning: Failed to save Sheet ID to file: {ex.Message}");
        }
    }

    private string LoadSheetIdFromFile(string defaultSheetId)
    {
        try
        {
            var configPath = "/app/current_sheet_id.txt";
            if (File.Exists(configPath))
            {
                var savedSheetId = File.ReadAllText(configPath).Trim();
                if (!string.IsNullOrWhiteSpace(savedSheetId))
                {
                    Console.WriteLine($"Loaded Sheet ID from file: {savedSheetId}");
                    return savedSheetId;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to load Sheet ID from file: {ex.Message}");
        }
        
        return defaultSheetId;
    }

    public void ClearCache()
    {
        _cache = null;
        _cacheTimestamp = DateTime.MinValue;
        _sprintCache = null;
        _sprintCacheTimestamp = DateTime.MinValue;
        _projectCache = null;
        _projectCacheTimestamp = DateTime.MinValue;
    }

    // 新增：獲取 GetJiraSprintValues 表格的完整資料
    private string GetSprintValuesFullCsvUrl() => $"https://docs.google.com/spreadsheets/d/{_sheetId}/gviz/tq?tqx=out:csv&sheet={_sheetSprintInfo}";

    private async Task<List<Dictionary<string, object?>>> FetchSprintValuesDataAsync()
    {
        var url = GetSprintValuesFullCsvUrl();
        using var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            PrepareHeaderForMatch = args => args.Header.ToLower().Replace(" ", "_").Replace(".", "_")
        });

        var records = new List<Dictionary<string, object?>>();
        await foreach (var record in csv.GetRecordsAsync<dynamic>())
        {
            records.Add(new Dictionary<string, object?>(record));
        }

        return records;
    }

    public async Task<SprintInfo> GetSprintInfoAsync(string sprintName)
    {
        var sprintData = await FetchSprintValuesDataAsync();
        var sprintRecord = sprintData.FirstOrDefault(row => 
            row.ContainsKey("sprint_name") && 
            row["sprint_name"]?.ToString() == sprintName);

        if (sprintRecord == null)
        {
            throw new ArgumentException($"Sprint '{sprintName}' not found");
        }

        return new SprintInfo(
            SprintName: sprintRecord["sprint_name"]?.ToString() ?? "",
            SprintId: int.TryParse(sprintRecord["sprint_id"]?.ToString(), out var id) ? id : 0,
            BoardName: sprintRecord["board_name"]?.ToString() ?? "",
            State: sprintRecord["state"]?.ToString() ?? "",
            StartDate: TryParseDateTime(sprintRecord["startdate"]?.ToString()),
            EndDate: TryParseDateTime(sprintRecord["enddate"]?.ToString()),
            CompleteDate: TryParseDateTime(sprintRecord["completedate"]?.ToString()),
            Goal: sprintRecord["goal"]?.ToString() ?? ""
        );
    }

    public async Task<SprintBurndownResponse> GetSprintBurndownDataAsync(string sprintName)
    {
        // 獲取 Sprint 基本資訊
        var sprintInfo = await GetSprintInfoAsync(sprintName);
        
        // 獲取該 Sprint 的所有 Issues
        var allData = await FetchAndCacheDataAsync();
        var sprintIssues = allData.Where(row => 
            row.ContainsKey("sprint") && 
            row["sprint"]?.ToString() == sprintName).ToList();

        if (!sprintIssues.Any())
        {
            throw new ArgumentException($"No issues found for Sprint '{sprintName}'");
        }

        // 計算基本統計
        var storyPointsColumn = FindStoryPointsColumn(sprintIssues);
        var totalStoryPoints = CalculateTotalStoryPoints(sprintIssues, storyPointsColumn);
        
        var completedIssues = sprintIssues.Where(row => IsDoneStatus(row)).ToList();
        var completedStoryPoints = CalculateTotalStoryPoints(completedIssues, storyPointsColumn);
        var remainingStoryPoints = totalStoryPoints - completedStoryPoints;
        var completionRate = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints * 100) : 0;

        // 計算工作日
        var startDate = sprintInfo.StartDate ?? DateTime.Now.AddDays(-14);
        var endDate = sprintInfo.EndDate ?? DateTime.Now;
        var now = DateTime.Now;

        var totalWorkingDays = CalculateWorkingDays(startDate, endDate);
        var daysElapsed = CalculateWorkingDays(startDate, DateTime.Now < endDate ? DateTime.Now : endDate);
        var remainingWorkingDays = Math.Max(0, totalWorkingDays - daysElapsed);

        // 判斷健康狀態
        string status;
        if (totalWorkingDays > 0)
        {
            var expectedCompletion = (double)daysElapsed / totalWorkingDays * 100;
            var deviation = completionRate - expectedCompletion;

            if (deviation >= -10) status = "normal";
            else if (deviation >= -25) status = "warning";
            else status = "danger";
        }
        else
        {
            status = "normal";
        }

        // 生成每日進度資料
        var dailyProgress = GenerateDailyProgress(startDate, endDate, totalStoryPoints, sprintIssues, storyPointsColumn ?? "Story Points", daysElapsed);
        var chartData = FormatChartData(dailyProgress);

        var sprintData = new SprintBurndownData(
            SprintName: sprintName,
            TotalStoryPoints: totalStoryPoints,
            CompletedStoryPoints: completedStoryPoints,
            RemainingStoryPoints: remainingStoryPoints,
            CompletionRate: Math.Round(completionRate, 2),
            Status: status,
            TotalWorkingDays: totalWorkingDays,
            DaysElapsed: daysElapsed,
            RemainingWorkingDays: remainingWorkingDays
        );

        return new SprintBurndownResponse(sprintData, dailyProgress, chartData);
    }

    public async Task<List<Dictionary<string, object?>>> GetSprintListAsync()
    {
        return await FetchSprintValuesDataAsync();
    }

    private int CalculateWorkingDays(DateTime startDate, DateTime endDate)
    {
        if (startDate >= endDate) return 0;

        var workingDays = 0;
        var current = startDate;

        while (current < endDate)
        {
            // Monday = 1, Sunday = 0
            if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
            {
                workingDays++;
            }
            current = current.AddDays(1);
        }

        return workingDays;
    }

    private List<DayProgress> GenerateDailyProgress(DateTime startDate, DateTime endDate, double totalPoints, 
        List<Dictionary<string, object?>> sprintIssues, string storyPointsColumn, int currentWorkingDay)
    {
        var dailyProgress = new List<DayProgress>();
        var current = startDate;
        var dayNumber = 0;
        var totalWorkingDays = CalculateWorkingDays(startDate, endDate);

        while (current <= endDate)
        {
            var isWorkingDay = current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday;

            if (isWorkingDay)
            {
                dayNumber++;

                // 理想燃燒線：線性下降（顯示完整的理想線）
                var idealRemaining = totalWorkingDays > 0 
                    ? totalPoints * (1.0 - (double)dayNumber / totalWorkingDays)
                    : totalPoints;

                // 實際燃燒線：只顯示到當前工作日為止
                double? actualRemaining = null;
                if (dayNumber <= currentWorkingDay)
                {
                    var completedByDate = sprintIssues
                        .Where(row => IsDoneStatus(row) && IsResolvedByDate(row, current))
                        .Sum(row => ParseStoryPoints(row, storyPointsColumn));
                    
                    actualRemaining = totalPoints - completedByDate;
                }

                dailyProgress.Add(new DayProgress(
                    Day: dayNumber,
                    Date: current.ToString("yyyy-MM-dd"),
                    IdealRemaining: Math.Round(idealRemaining, 2),
                    ActualRemaining: actualRemaining.HasValue ? Math.Round(actualRemaining.Value, 2) : (double?)null,
                    IsWorkingDay: true
                ));
            }

            current = current.AddDays(1);
        }

        return dailyProgress;
    }

    private List<Dictionary<string, object>> FormatChartData(List<DayProgress> dailyProgress)
    {
        return dailyProgress
            .Where(item => item.IsWorkingDay)
            .Select(item => new Dictionary<string, object>
            {
                ["day"] = item.Day,
                ["date"] = item.Date,
                ["ideal"] = item.IdealRemaining,
                ["actual"] = item.ActualRemaining
            })
            .ToList();
    }

    private bool IsResolvedByDate(Dictionary<string, object?> row, DateTime date)
    {
        var resolvedValue = row.ContainsKey("resolved") ? row["resolved"]?.ToString() : null;
        if (string.IsNullOrEmpty(resolvedValue)) return false;

        if (TryParseDateTime(resolvedValue) is DateTime resolvedDate)
        {
            return resolvedDate.Date <= date.Date;
        }

        return false;
    }

    private DateTime? TryParseDateTime(string? dateStr)
    {
        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        var formats = new[] {
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd",
            "M/d/yyyy H:mm:ss",
            "M/d/yyyy",
            "MM/dd/yyyy HH:mm:ss",
            "MM/dd/yyyy"
        };

        foreach (var format in formats)
        {
            if (DateTime.TryParseExact(dateStr, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result))
            {
                return result;
            }
        }

        if (DateTime.TryParse(dateStr, out var parsed))
        {
            return parsed;
        }

        return null;
    }

    // Priority time limits mapping (days)
    private static readonly Dictionary<string, int> PriorityTimeLimits = new()
    {
        { "Highest", 381 },
        { "High", 360 },
        { "Medium", 10 },
        { "Low", 394 },
        { "Lowest", 410 }
    };

    public async Task<OverdueIssuesResponse> GetOverdueIssuesAsync(string? sprint = null, string? project = null)
    {
        var data = await FetchAndCacheDataAsync();
        var now = DateTime.UtcNow;
        
        var filteredData = data.AsEnumerable();

        // Apply filters
        if (!string.IsNullOrEmpty(sprint) && sprint != "All")
        {
            filteredData = filteredData.Where(row => 
                row.ContainsKey("sprint") && row["sprint"]?.ToString()?.Trim() == sprint);
        }

        if (!string.IsNullOrEmpty(project) && project != "All")
        {
            filteredData = filteredData.Where(row => 
                row.ContainsKey("projects") && row["projects"]?.ToString()?.Contains(project) == true);
        }

        // Filter for unresolved issues (no resolved date)
        var unresolvedIssues = filteredData.Where(row => 
        {
            var resolvedValue = row.ContainsKey("resolved") ? row["resolved"]?.ToString() : null;
            return string.IsNullOrEmpty(resolvedValue) || resolvedValue.Trim().Length == 0;
        });

        var overdueIssues = new List<OverdueIssue>();

        foreach (var issue in unresolvedIssues)
        {
            var createdValue = issue.ContainsKey("created") ? issue["created"]?.ToString() : null;
            var priorityValue = issue.ContainsKey("priority") ? issue["priority"]?.ToString()?.Trim() : null;
            
            if (string.IsNullOrEmpty(createdValue)) continue;
            
            var createdDate = TryParseDateTime(createdValue);
            if (createdDate == null) continue;

            // Use default priority if null or empty
            var priority = string.IsNullOrEmpty(priorityValue) ? "Medium" : priorityValue;

            // Calculate days elapsed
            var daysElapsed = (int)(now - createdDate.Value).TotalDays;
            
            // Get time limit for this priority
            var timeLimit = PriorityTimeLimits.GetValueOrDefault(priority, 7); // Default to 7 days for unknown priorities
            
            // Check if overdue
            if (daysElapsed > timeLimit)
            {
                var overdueIssue = new OverdueIssue(
                    Key: issue.ContainsKey("key") ? issue["key"]?.ToString() ?? "" : "",
                    Summary: issue.ContainsKey("summary") ? issue["summary"]?.ToString() ?? "" : "",
                    Priority: priority,
                    Status: issue.ContainsKey("status") ? issue["status"]?.ToString() ?? "" : "",
                    Created: createdDate.Value,
                    DaysElapsed: daysElapsed,
                    DaysLimit: timeLimit,
                    DaysOverdue: daysElapsed - timeLimit,
                    Project: issue.ContainsKey("projects") ? issue["projects"]?.ToString() ?? "" : "",
                    Assignee: issue.ContainsKey("assignee") ? issue["assignee"]?.ToString() : null
                );
                
                overdueIssues.Add(overdueIssue);
            }
        }

        // Sort by days overdue (most overdue first)
        overdueIssues = overdueIssues.OrderByDescending(x => x.DaysOverdue).ToList();

        return new OverdueIssuesResponse(
            OverdueIssues: overdueIssues,
            TotalCount: overdueIssues.Count,
            PriorityLimits: PriorityTimeLimits,
            LastUpdated: now
        );
    }
}
