"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";

type Metrics = {
  convertedLeads: number;
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  leadsByPriority: Record<string, number>;
};

export default function MyPerformancePage() {
  const { user, loading } = useAuth('sales');
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => setMetrics(d.metrics || null))
      .catch(() => setMetrics(null));
  }, [user]);

  if (loading) {
    return <LoadingScreen message="Loading your performance..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="sales">
      <div className="space-y-6 text-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500">My Total Leads</div>
            <div className="text-2xl font-semibold">{metrics?.totalLeads ?? 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500">Converted</div>
            <div className="text-2xl font-semibold">{metrics?.convertedLeads ?? 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500">New</div>
            <div className="text-2xl font-semibold">{metrics?.leadsByStatus?.new ?? 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Leads by Status</h2>
            <ul className="space-y-2 text-sm">
              {Object.entries(metrics?.leadsByStatus || {}).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-3">Leads by Priority</h2>
            <ul className="space-y-2 text-sm">
              {Object.entries(metrics?.leadsByPriority || {}).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


