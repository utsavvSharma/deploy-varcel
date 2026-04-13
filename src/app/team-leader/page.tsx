"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, isFollowUpDue, isFollowUpOverdue } from "@/utils/date";
import { useToast } from "@/contexts/ToastContext";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonStatCard, SkeletonLeadCard } from "@/components/Skeleton";
import { Users, UserCheck, Target, TrendingUp } from "lucide-react";
import Link from "next/link";

type Lead = any;

export default function TeamLeaderPage() {
  const { user, loading } = useAuth("team_leader");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [memberMetrics, setMemberMetrics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saleAmountModal, setSaleAmountModal] = useState<{
    open: boolean; leadId: string; leadName: string; saleAmount: string;
  }>({ open: false, leadId: "", leadName: "", saleAmount: "" });
  const { showToast } = useToast();

  useEffect(() => {
    if (user && !loading) {
      refreshAll();
      const interval = setInterval(refreshAll, 60_000);
      return () => clearInterval(interval);
    }
  }, [user, loading]);

  async function fetchTeamData() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeamMembers(data.teamMembers || []);
    } catch (e) {
      console.error("Error fetching team:", e);
    }
  }

  async function fetchTeamLeads() {
    try {
      const res = await fetch("/api/teams/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      console.error("Error fetching team leads:", e);
    }
  }

  async function fetchMyLeads() {
    try {
      const res = await fetch(`/api/leads?assigned=${user?.id}`);
      const data = await res.json();
      setMyLeads(data.leads || []);
    } catch (e) {
      console.error("Error fetching my leads:", e);
    }
  }

  async function fetchTeamMetrics() {
    try {
      const res = await fetch("/api/teams/metrics");
      const data = await res.json();
      setTeamStats(data.teamStats || null);
      setMemberMetrics(data.memberMetrics || []);
    } catch (e) {
      console.error("Error fetching metrics:", e);
    }
  }

  async function refreshAll() {
    setIsLoading(true);
    try {
      await Promise.all([fetchTeamData(), fetchTeamLeads(), fetchTeamMetrics(), fetchMyLeads()]);
    } catch (error) {
      console.error("Error in refreshAll:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function markLead(id: string, status: "CONTACTED" | "CONVERTED", leadName?: string) {
    if (status === "CONVERTED") {
      const lead = [...myLeads, ...leads].find(l => l.id === id);
      setSaleAmountModal({ open: true, leadId: id, leadName: leadName || lead?.name || "", saleAmount: "" });
      return;
    }
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, followUpDate: null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await refreshAll();
      showToast("Lead marked contacted", "success");
    } catch (e) {
      showToast("Failed to update lead", "error");
    }
  }

  async function submitSaleAmount() {
    const amount = parseFloat(saleAmountModal.saleAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid sale amount", "error");
      return;
    }
    try {
      const res = await fetch(`/api/leads/${saleAmountModal.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTED", saleAmount: amount, followUpDate: null }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await refreshAll();
      showToast("Lead converted successfully", "success");
      setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" });
    } catch (e) {
      showToast("Failed to convert lead", "error");
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading team leader dashboard..." />;
  }

  if (!user) return null;

  const recentLeads = leads.slice(0, 5);
  const myFollowUpDue = myLeads.filter(
    (l: any) => l.followUpDate && isFollowUpDue(l.followUpDate)
  );
  const myOverdue = myLeads.filter(
    (l: any) => l.followUpDate && isFollowUpOverdue(l.followUpDate)
  );
  const teamFollowUpDue = leads.filter(
    (l: any) => l.followUpDate && isFollowUpDue(l.followUpDate)
  );
  const teamOverdue = leads.filter(
    (l: any) => l.followUpDate && isFollowUpOverdue(l.followUpDate)
  );
  const myConverted = myLeads.filter((l: any) => String(l.status).toUpperCase() === "CONVERTED").length;

  return (
    <DashboardLayout userType="team_leader">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user.name}!
            </h1>
            <p className="text-gray-500">Here&apos;s your personal &amp; team overview</p>
          </div>
        </div>

        {/* My Stats Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">My Leads</h2>
            <Link href="/team-leader/my-leads" className="text-sm text-purple-600 hover:text-purple-800">
              View All →
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                <div className="text-sm text-gray-500">My Total Leads</div>
                <div className="text-2xl font-semibold">{myLeads.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                <div className="text-sm text-gray-500">My Converted</div>
                <div className="text-2xl font-semibold text-green-600">{myConverted}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
                <div className="text-sm text-gray-500">My Follow-ups Due</div>
                <div className="text-2xl font-semibold text-amber-600">{myFollowUpDue.length + myOverdue.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* My Follow-ups Alert */}
        {(myFollowUpDue.length > 0 || myOverdue.length > 0) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-3">
              ⚠️ Your Follow-up Alerts
            </h3>
            <div className="space-y-2">
              {[...myOverdue, ...myFollowUpDue.filter((l: any) => !isFollowUpOverdue(l.followUpDate))].map((lead: any) => (
                <div
                  key={lead.id}
                  className="bg-white border border-purple-300 rounded-lg p-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{lead.name}</h4>
                      {lead.email && <p className="text-sm text-gray-600">{lead.email}</p>}
                      {lead.phone && <p className="text-sm text-gray-500">Phone: {lead.phone}</p>}
                      {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          isFollowUpOverdue(lead.followUpDate)
                            ? "text-red-600"
                            : "text-purple-600"
                        }`}
                      >
                        {isFollowUpOverdue(lead.followUpDate) ? "OVERDUE" : "Due Today"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Follow-up: {formatDate(lead.followUpDate)}
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          onClick={() => markLead(lead.id, "CONTACTED")}
                          className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Called
                        </button>
                        <button
                          onClick={() => markLead(lead.id, "CONVERTED", lead.name)}
                          className="px-3 py-1 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700"
                        >
                          Converted
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Stats Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Team Overview</h2>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Team Members"
              value={teamStats?.totalMembers || 0}
              icon={<Users className="w-6 h-6" />}
            />
            <StatCard
              title="Total Leads"
              value={teamStats?.totalLeads || 0}
              icon={<UserCheck className="w-6 h-6" />}
            />
            <StatCard
              title="Converted"
              value={teamStats?.totalConverted || 0}
              icon={<Target className="w-6 h-6" />}
            />
            <StatCard
              title="Conversion Rate"
              value={parseFloat(teamStats?.conversionRate || "0")}
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Team Follow-ups Alert */}
        {(teamFollowUpDue.length > 0 || teamOverdue.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-3">
              ⚠️ Team Follow-up Alerts
            </h3>
            <div className="space-y-2">
              {[...teamOverdue, ...teamFollowUpDue.filter((l: any) => !isFollowUpOverdue(l.followUpDate))].map((lead: any) => (
                <div
                  key={lead.id}
                  className="bg-white border border-amber-300 rounded-lg p-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{lead.name}</h4>
                      {lead.email && <p className="text-sm text-gray-600">{lead.email}</p>}
                      {lead.phone && <p className="text-sm text-gray-500">Phone: {lead.phone}</p>}
                      <p className="text-sm text-gray-500 font-semibold">
                        Assigned to: {lead.assignedUser?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          isFollowUpOverdue(lead.followUpDate)
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {isFollowUpOverdue(lead.followUpDate) ? "OVERDUE" : "Due Today"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Follow-up: {formatDate(lead.followUpDate)}
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          onClick={() => markLead(lead.id, "CONTACTED")}
                          className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Called
                        </button>
                        <button
                          onClick={() => markLead(lead.id, "CONVERTED", lead.name)}
                          className="px-3 py-1 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700"
                        >
                          Converted
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Performance Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Team Performance</h2>
              <Link
                href="/team-leader/reports"
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                View Details →
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLeadCard key={i} />
                ))}
              </div>
            ) : memberMetrics.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No team members assigned yet
              </p>
            ) : (
              <div className="space-y-3">
                {memberMetrics.map((m: any) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-sm text-gray-500">
                        {m.totalLeads} leads &middot; {m.convertedLeads}{" "}
                        converted
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-600">
                        {m.conversionRate}%
                      </p>
                      <p className="text-xs text-gray-500">conversion</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Team Leads</h2>
              <Link
                href="/team-leader/leads"
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                View All →
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonLeadCard key={i} />
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No leads assigned to your team yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-sm text-gray-500">
                          {lead.company || "No company"} &middot; Assigned to{" "}
                          {lead.assignedUser?.name || "Unknown"}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lead.status === "CONVERTED"
                            ? "bg-green-100 text-green-800"
                            : lead.status === "INTERESTED"
                            ? "bg-blue-100 text-blue-800"
                            : lead.status === "CONTACTED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sale Amount Modal */}
      {saleAmountModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Convert Lead</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the sale amount for <span className="font-medium">{saleAmountModal.leadName}</span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={saleAmountModal.saleAmount}
                onChange={(e) => setSaleAmountModal({ ...saleAmountModal, saleAmount: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" })}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitSaleAmount}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Convert Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
