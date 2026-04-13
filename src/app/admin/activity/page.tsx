"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/utils/date";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonActivityLog } from "@/components/Skeleton";
import Link from "next/link";

type SessionRow = {
  id: string;
  userId: string;
  userName: string;
  loginAt: string | Date;
  logoutAt?: string | Date | null;
  durationSec?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  lastActiveAt?: string | Date | null;
  status: "active" | "offline";
  canRemoteLogout?: boolean;
};

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

export default function EmployeeActivityPage() {
  const { user, loading } = useAuth("admin");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "offline">("all");
  const [sortBy, setSortBy] = useState<"login" | "duration" | "status">(
    "login"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [displayCount, setDisplayCount] = useState(20);

  const ITEMS_PER_PAGE = 20;

  async function fetchSessions() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
      setRefreshCountdown(60);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchSessions();
      const interval = setInterval(fetchSessions, 60_000);
      const countdown = setInterval(() => {
        setRefreshCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      return () => {
        clearInterval(interval);
        clearInterval(countdown);
      };
    }
  }, [user]);

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    list.sort((a, b) => {
      if (sortBy === "login") {
        return sortDir === "asc"
          ? new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
          : new Date(b.loginAt).getTime() - new Date(a.loginAt).getTime();
      } else if (sortBy === "duration") {
        // For ended sessions, use the stored durationSec or calculate from logoutAt - loginAt
        const da = a.logoutAt 
          ? (a.durationSec ?? Math.floor((new Date(a.logoutAt).getTime() - new Date(a.loginAt).getTime()) / 1000))
          : Math.max(0, Math.floor((Date.now() - new Date(a.loginAt).getTime()) / 1000));
        const db = b.logoutAt 
          ? (b.durationSec ?? Math.floor((new Date(b.logoutAt).getTime() - new Date(b.loginAt).getTime()) / 1000))
          : Math.max(0, Math.floor((Date.now() - new Date(b.loginAt).getTime()) / 1000));
        return sortDir === "asc" ? da - db : db - da;
      } else if (sortBy === "status") {
        return sortDir === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      return 0;
    });
    return list;
  }, [sessions, filter, sortBy, sortDir]);

  const displayedSessions = filteredSessions.slice(0, displayCount);
  const hasMore = filteredSessions.length > displayCount;

  // Reset display count when filter or sort changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filter, sortBy, sortDir]);

  const activeCount = sessions.filter((s) => s.status === "active").length;

  if (loading) {
    return <LoadingScreen message="Loading activity..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6 text-black">
        {/* Stats Header */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-white rounded-lg shadow-sm p-4 min-w-[200px]">
            <div className="text-sm text-gray-500">Currently Active</div>
            <div className="text-2xl font-semibold">{activeCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 min-w-[200px]">
            <div className="text-sm text-gray-500">
              Total Sessions (last 500)
            </div>
            <div className="text-2xl font-semibold">{sessions.length}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={fetchSessions}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <span className="text-sm text-gray-500">
              Auto refresh in {refreshCountdown}s
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">Filter:</span>
          {["all", "active", "offline"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-300 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Employee Activity</h2>

          {isLoading ? (
            <div className="py-10 text-center text-gray-500">
              <div className="animate-pulse text-sm">
                Loading recent sessions...
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No session activity found.
            </div>
          ) : (
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3">User</th>
                  <th
                    className="text-left py-2 px-3 cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setSortBy("login");
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    Login Time
                  </th>
                  <th className="text-left py-2 px-3">Logout Time</th>
                  <th
                    className="text-left py-2 px-3 cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setSortBy("status");
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    Status
                  </th>
                  <th className="text-left py-2 px-3">IP</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedSessions.map((s, i) => {
                  return (
                    <tr
                      key={s.id}
                      className={`border-b hover:bg-gray-50 ${
                        i % 2 === 0 ? "bg-gray-50/40" : "bg-white"
                      }`}
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/users/${s.userId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {s.userName}
                        </Link>
                      </td>
                      <td className="py-2 px-3">{formatDateTime(s.loginAt)}</td>
                      <td className="py-2 px-3">
                        {s.logoutAt ? formatDateTime(s.logoutAt) : "-"}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            s.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {s.status === "active" ? "Active" : "Ended"}
                        </span>
                      </td>
                      <td className="py-2 px-3">{s.ip || "-"}</td>
                    <td className="py-2 px-3">
                      {s.canRemoteLogout ? (
                        <button
                          onClick={async () => {
                            try {
                              await fetch('/api/sessions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: s.id }),
                              });
                              fetchSessions();
                            } catch {}
                          }}
                          className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Remote Logout
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Load More Button */}
          {!isLoading && hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Load More ({filteredSessions.length - displayCount} remaining)
              </button>
            </div>
          )}

          {!isLoading && !hasMore && filteredSessions.length > ITEMS_PER_PAGE && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Showing all {filteredSessions.length} sessions
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
