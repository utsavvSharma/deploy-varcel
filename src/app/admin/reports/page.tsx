"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { User, Lead } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import LoadingScreen from "@/components/LoadingScreen";
import Link from "next/link";

interface SalesMetric {
  userId: string;
  name: string;
  totalLeads: number;
  convertedLeads: number;
  publicLeads: number;
}

export default function ReportsPage() {
  const { user, loading } = useAuth("admin");
  const [metrics, setMetrics] = useState<SalesMetric[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [publicLeads, setPublicLeads] = useState(0);
  const [period, setPeriod] = useState<"7days" | "30days" | "all">("30days");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) fetchMetrics();
  }, [user, period]);

  async function fetchMetrics() {
    setIsLoading(true);
    try {
      const [usersRes, leadsRes] = await Promise.all([fetch("/api/users"), fetch("/api/leads")]);
      const [{ users }, { leads }] = await Promise.all([usersRes.json(), leadsRes.json()]);

      const salesUsers = users.filter((u: User) => u.role === "sales" || u.role === "team_leader");
      const allLeads = (leads || []) as Lead[];

      // Filter leads by period
      const now = new Date();
      let filteredLeads = allLeads;
      if (period === "7days") {
        filteredLeads = allLeads.filter(
          (l) => new Date(l.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        );
      } else if (period === "30days") {
        filteredLeads = allLeads.filter(
          (l) => new Date(l.createdAt) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        );
      }

      setTotalLeads(filteredLeads.length);
      setPublicLeads(filteredLeads.filter((l) => l.public).length);

      const userMetrics: SalesMetric[] = salesUsers.map((u: User) => {
        const userLeads = filteredLeads.filter((l) => l.assignedTo === u.id);
        return {
          userId: u.id,
          name: u.name,
          totalLeads: userLeads.length,
          convertedLeads: userLeads.filter((l) => l.status.toUpperCase() === "CONVERTED").length,
          publicLeads: userLeads.filter((l) => l.public).length,
        };
      });

      setMetrics(userMetrics);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading reports..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header + period selector */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "7days" | "30days" | "all")}
            className="border rounded-lg px-3 py-2"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
            <div className="mt-2 text-3xl font-semibold">{totalLeads}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Public Pool</h3>
            <div className="mt-2 text-3xl font-semibold">{publicLeads}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Sales Team</h3>
            <div className="mt-2 text-3xl font-semibold">{metrics.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500">Avg Leads/Person</h3>
            <div className="mt-2 text-3xl font-semibold">
              {metrics.length ? (totalLeads / metrics.length).toFixed(1) : "0"}
            </div>
          </div>
        </div>

        {/* Leads per Salesperson Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Leads Per Salesperson</h2>
          {isLoading || metrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading chart...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalLeads" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="convertedLeads" fill="#10b981" name="Converted" />
                <Bar dataKey="publicLeads" fill="#facc15" name="Public" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team Performance Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Team Performance</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading metrics...</div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No sales metrics available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Sales Person</th>
                    <th className="text-left py-3 px-4">Total Leads</th>
                    <th className="text-left py-3 px-4">Converted</th>
                    <th className="text-left py-3 px-4">Made Public</th>
                    <th className="text-left py-3 px-4">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.userId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/users/${metric.userId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {metric.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{metric.totalLeads}</td>
                      <td className="py-3 px-4">{metric.convertedLeads}</td>
                      <td className="py-3 px-4">{metric.publicLeads}</td>
                      <td className="py-3 px-4">
                        {metric.totalLeads
                          ? `${((metric.convertedLeads / metric.totalLeads) * 100).toFixed(1)}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
