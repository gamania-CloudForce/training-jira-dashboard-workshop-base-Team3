import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

export interface UseOverdueIssuesParams {
  sprint?: string;
  project?: string;
}

export function useOverdueIssues(params: UseOverdueIssuesParams = {}) {
  const [data, setData] = useState<OverdueIssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sprint, project } = params;

  const fetchOverdueIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (sprint && sprint !== "All") {
        queryParams.append("sprint", sprint);
      }
      if (project && project !== "All") {
        queryParams.append("project", project);
      }

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/api/dashboard/overdue-issues${
        queryString ? `?${queryString}` : ""
      }`;
      
      console.log("Fetching overdue issues from:", url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch overdue issues: ${response.status} ${response.statusText}`
        );
      }

      const result: OverdueIssuesData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching overdue issues:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [sprint, project]);

  useEffect(() => {
    fetchOverdueIssues();
  }, [fetchOverdueIssues]);

  const refetch = () => {
    fetchOverdueIssues();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}
