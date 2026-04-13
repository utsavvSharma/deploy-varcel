"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/utils/date";
import LoadingScreen from "@/components/LoadingScreen";
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Calendar,
  Activity,
  Clock,
  LogIn,
  LogOut,
  UserPlus,
  Edit,
  Trash2,
  MessageSquare,
  CheckCircle,
  CalendarClock
} from "lucide-react";

type ActivityLog = {
  id: string;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
};

type SessionLog = {
  id: string;
  loginAt: string;
  logoutAt?: string | null;
  durationSec?: number | null;
  ip?: string | null;
  userAgent?: string | null;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

const actionIcons: Record<string, any> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  LEAD_CREATED: UserPlus,
  LEAD_UPDATED: Edit,
  LEAD_DELETED: Trash2,
  LEAD_ASSIGNED: UserPlus,
  LEAD_CLAIMED: UserPlus,
  NOTE_ADDED: MessageSquare,
  STATUS_CHANGED: CheckCircle,
  FOLLOWUP_SET: CalendarClock,
};

const actionColors: Record<string, string> = {
  LOGIN: "text-green-600 bg-green-50",
  LOGOUT: "text-gray-600 bg-gray-50",
  LEAD_CREATED: "text-blue-600 bg-blue-50",
  LEAD_UPDATED: "text-yellow-600 bg-yellow-50",
  LEAD_DELETED: "text-red-600 bg-red-50",
  LEAD_ASSIGNED: "text-purple-600 bg-purple-50",
  LEAD_CLAIMED: "text-indigo-600 bg-indigo-50",
  NOTE_ADDED: "text-cyan-600 bg-cyan-50",
  STATUS_CHANGED: "text-emerald-600 bg-emerald-50",
  FOLLOWUP_SET: "text-orange-600 bg-orange-50",
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth("admin");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activity" | "sessions">("activity");
  const [displayCount, setDisplayCount] = useState(20);

  const userId = params.id as string;

  useEffect(() => {
    if (user && userId) {
      fetchUserData();
    }
  }, [user, userId]);

  async function fetchUserData() {
    setLoading(true);
    try {
      // Fetch user profile
      const userRes = await fetch(`/api/users/${userId}`);
      const userData = await userRes.json();
      setProfile(userData.user);

      // Fetch activity logs and sessions
      const activityRes = await fetch(`/api/users/${userId}/activity`);
      const activityData = await activityRes.json();
      setActivityLogs(activityData.activityLogs || []);
      setSessions(activityData.sessions || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!user || !profile) {
    return null;
  }

  const displayedLogs = activityLogs.slice(0, displayCount);
  const hasMore = activityLogs.length > displayCount;

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold">Team Member Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 break-words">{profile.name}</h2>
              <div className="space-y-2 text-sm sm:text-base text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="capitalize">{profile.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Joined {formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Activities</div>
            <div className="text-2xl font-semibold">{activityLogs.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Sessions</div>
            <div className="text-2xl font-semibold">{sessions.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Active Session</div>
            <div className="text-2xl font-semibold">
              {sessions.some(s => !s.logoutAt) ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-gray-400">No</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("activity")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "activity"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity Logs
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "sessions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Login Sessions
            </button>
          </nav>
        </div>

        {/* Activity Logs Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            {displayedLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activities recorded yet
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {displayedLogs.map((log) => {
                    const Icon = actionIcons[log.action] || Activity;
                    const colorClass = actionColors[log.action] || "text-gray-600 bg-gray-50";
                    
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{log.description}</p>
                          {log.metadata && (
                            <p className="text-sm text-gray-500 mt-1">
                              {log.metadata.leadName && `Lead: ${log.metadata.leadName}`}
                              {log.metadata.oldStatus && log.metadata.newStatus && 
                                ` (${log.metadata.oldStatus} → ${log.metadata.newStatus})`}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setDisplayCount(prev => prev + 20)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Load More ({activityLogs.length - displayCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Login Sessions</h3>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sessions recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4">Login Time</th>
                      <th className="text-left py-3 px-4">Logout Time</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDateTime(session.loginAt)}</td>
                        <td className="py-3 px-4">
                          {session.logoutAt ? formatDateTime(session.logoutAt) : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {session.logoutAt ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              Ended
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{session.ip || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
