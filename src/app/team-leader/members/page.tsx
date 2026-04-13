"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonUserCard } from "@/components/Skeleton";
import { formatDate } from "@/utils/date";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: string;
};

type MemberMetric = {
  userId: string;
  name: string;
  email: string;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  interestedLeads: number;
  convertedLeads: number;
  totalSaleAmount: number;
  conversionRate: string;
};

export default function TeamMembersPage() {
  const { user, loading } = useAuth("team_leader");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberMetrics, setMemberMetrics] = useState<MemberMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [teamRes, metricsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/teams/metrics"),
      ]);
      const teamData = await teamRes.json();
      const metricsData = await metricsRes.json();
      setTeamMembers(teamData.teamMembers || []);
      setMemberMetrics(metricsData.memberMetrics || []);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading team..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="team_leader">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">My Team</h1>
            <p className="text-gray-500 text-sm">
              {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonUserCard key={i} />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No team members yet
            </h3>
            <p className="text-gray-500">
              Ask your admin to assign team members to you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => {
              const metrics = memberMetrics.find(
                (m) => m.userId === member.id
              );
              return (
                <div
                  key={member.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-lg">
                        {member.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      {member.username && (
                        <p className="text-xs text-gray-400">
                          @{member.username}
                        </p>
                      )}
                    </div>
                  </div>

                  {metrics && (
                    <div className="border-t pt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Total Leads</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {metrics.totalLeads}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Converted</p>
                        <p className="text-lg font-semibold text-green-600">
                          {metrics.convertedLeads}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conversion Rate</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {metrics.conversionRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Sales Amount</p>
                        <p className="text-lg font-semibold text-amber-600">
                          ₹{metrics.totalSaleAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Status breakdown */}
                      <div className="col-span-2 mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Lead Pipeline</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                          {metrics.newLeads > 0 && (
                            <div
                              className="bg-gray-400"
                              style={{
                                width: `${
                                  (metrics.newLeads / Math.max(metrics.totalLeads, 1)) * 100
                                }%`,
                              }}
                              title={`New: ${metrics.newLeads}`}
                            />
                          )}
                          {metrics.contactedLeads > 0 && (
                            <div
                              className="bg-yellow-400"
                              style={{
                                width: `${
                                  (metrics.contactedLeads / Math.max(metrics.totalLeads, 1)) * 100
                                }%`,
                              }}
                              title={`Contacted: ${metrics.contactedLeads}`}
                            />
                          )}
                          {metrics.interestedLeads > 0 && (
                            <div
                              className="bg-blue-400"
                              style={{
                                width: `${
                                  (metrics.interestedLeads / Math.max(metrics.totalLeads, 1)) * 100
                                }%`,
                              }}
                              title={`Interested: ${metrics.interestedLeads}`}
                            />
                          )}
                          {metrics.convertedLeads > 0 && (
                            <div
                              className="bg-green-400"
                              style={{
                                width: `${
                                  (metrics.convertedLeads / Math.max(metrics.totalLeads, 1)) * 100
                                }%`,
                              }}
                              title={`Converted: ${metrics.convertedLeads}`}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-500">{metrics.newLeads} new</span>
                          <span className="text-yellow-600">{metrics.contactedLeads} contacted</span>
                          <span className="text-blue-600">{metrics.interestedLeads} interested</span>
                          <span className="text-green-600">{metrics.convertedLeads} converted</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
