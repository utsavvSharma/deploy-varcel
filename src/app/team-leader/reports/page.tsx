"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";

interface MemberMetric {
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
}

interface TeamStats {
  totalMembers: number;
  totalLeads: number;
  totalConverted: number;
  totalSales: number;
  conversionRate: string;
}

export default function TeamLeaderReportsPage() {
  const { user, loading } = useAuth("team_leader");
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [memberMetrics, setMemberMetrics] = useState<MemberMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("totalLeads");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (user) fetchMetrics();
  }, [user]);

  async function fetchMetrics() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teams/metrics");
      const data = await res.json();
      setTeamStats(data.teamStats || null);
      setMemberMetrics(data.memberMetrics || []);
    } catch (e) {
      console.error("Error fetching metrics:", e);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  const sorted = [...memberMetrics].sort((a: any, b: any) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  if (loading) return <LoadingScreen message="Loading reports..." />;
  if (!user) return null;

  return (
    <DashboardLayout userType="team_leader">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Team Performance</h1>

        {/* Team Overview Stats */}
        {teamStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500">Team Size</h3>
              <div className="mt-2 text-3xl font-semibold">
                {teamStats.totalMembers}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
              <div className="mt-2 text-3xl font-semibold">
                {teamStats.totalLeads}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500">Converted</h3>
              <div className="mt-2 text-3xl font-semibold text-green-600">
                {teamStats.totalConverted}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
              <div className="mt-2 text-3xl font-semibold text-amber-600">
                ₹{teamStats.totalSales.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500">
                Conversion Rate
              </h3>
              <div className="mt-2 text-3xl font-semibold text-purple-600">
                {teamStats.conversionRate}%
              </div>
            </div>
          </div>
        )}

        {/* Member Performance Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Individual Performance
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading metrics...
            </div>
          ) : memberMetrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No team members to show
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    {[
                      { key: "name", label: "Member" },
                      { key: "totalLeads", label: "Total Leads" },
                      { key: "newLeads", label: "New" },
                      { key: "contactedLeads", label: "Contacted" },
                      { key: "interestedLeads", label: "Interested" },
                      { key: "convertedLeads", label: "Converted" },
                      { key: "totalSaleAmount", label: "Sales Amount" },
                      { key: "conversionRate", label: "Rate" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        {sortBy === col.key && (
                          <span className="ml-1">
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m) => (
                    <tr
                      key={m.userId}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {m.totalLeads}
                      </td>
                      <td className="py-3 px-4">{m.newLeads}</td>
                      <td className="py-3 px-4">{m.contactedLeads}</td>
                      <td className="py-3 px-4">{m.interestedLeads}</td>
                      <td className="py-3 px-4 text-green-600 font-semibold">
                        {m.convertedLeads}
                      </td>
                      <td className="py-3 px-4 text-amber-600 font-semibold">
                        ₹{m.totalSaleAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            parseFloat(m.conversionRate) >= 50
                              ? "text-green-600"
                              : parseFloat(m.conversionRate) >= 25
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {m.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Performer Highlight */}
        {sorted.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm p-6 border border-purple-100">
            <h2 className="text-lg font-semibold mb-3 text-purple-800">
              Top Performer
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-800 font-bold text-xl">
                  {sorted[0].name[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-900">
                  {sorted[0].name}
                </p>
                <p className="text-sm text-purple-700">
                  {sorted[0].convertedLeads} conversions &middot; ₹
                  {sorted[0].totalSaleAmount.toLocaleString()} in sales
                  &middot; {sorted[0].conversionRate}% rate
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
