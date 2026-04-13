"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, isFollowUpDue, isFollowUpOverdue } from "@/utils/date";
import { useToast } from "@/contexts/ToastContext";
import { ConfirmModal } from "@/components/ui";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonStatCard, SkeletonLeadCard, SkeletonMarquee, SkeletonTable } from "@/components/Skeleton";
import { Users, UserCheck, Target, TrendingUp } from "lucide-react";

type Lead = any;
type User = any;

export default function AdminPage() {
  const { user, loading } = useAuth("admin");
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    priority: "MEDIUM",
    assignedTo: "",
    adminComment: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [topPerformer, setTopPerformer] = useState<any>(null);
  const [rankingHistory, setRankingHistory] = useState<any[]>([]);
  const [saleAmountModal, setSaleAmountModal] = useState<{
    open: boolean;
    leadId: string;
    leadName: string;
    saleAmount: string;
  }>({ open: false, leadId: "", leadName: "", saleAmount: "" });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const { showToast } = useToast();

  // Auto refresh every 60s
  useEffect(() => {
    if (user && !loading) {
      refreshAll();
      const interval = setInterval(refreshAll, 60_000);
      return () => clearInterval(interval);
    }
  }, [user, loading]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Filter out admin users and only show sales team members
      setUsers(data.users?.filter((u: any) => u.role === "sales" || u.role === "team_leader") || []);
    } catch (e) {
      console.error("Error fetching users:", e);
      showToast("Failed to fetch users", "error");
    }
  }

  async function fetchLeads() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Error fetching leads:", e);
      showToast("Failed to fetch leads", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTopPerformer() {
    try {
      const res = await fetch("/api/metrics/rankings");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setTopPerformer(data);
    } catch (e) {
      console.error("Error fetching rankings:", e);
    }
  }

  async function fetchRankingHistory() {
    try {
      const res = await fetch("/api/metrics/rankings/history?limit=3");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setRankingHistory(data.history || []);
    } catch (e) {
      console.error("Error fetching ranking history:", e);
    }
  }

  async function refreshAll() {
    try {
      await Promise.all([fetchUsers(), fetchLeads(), fetchTopPerformer(), fetchRankingHistory()]);
    } catch (error) {
      console.error("Error in refreshAll:", error);
    }
  }

  async function markLead(id: string, status: "CONTACTED" | "CONVERTED", leadName?: string) {
    if (status === "CONVERTED") {
      const lead = leads.find(l => l.id === id);
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

  async function submitLead(e: any) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to create lead" }));
        throw new Error(errorData.error || "Failed to create lead");
      }

      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        country: "",
        priority: "MEDIUM",
        assignedTo: "",
        adminComment: "",
      });
      await fetchLeads();
      showToast("Lead created successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to create lead", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitSaleAmount() {
    const amount = parseFloat(saleAmountModal.saleAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid sale amount", "error");
      return;
    }

    try {
      console.log('Submitting sale amount:', { leadId: saleAmountModal.leadId, amount, status: 'CONVERTED' });
      const res = await fetch(`/api/leads/${saleAmountModal.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTED", saleAmount: amount, followUpDate: null }),
      });
      console.log('Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || "Failed to update");
      }
      const result = await res.json();
      console.log('Success result:', result);
      await refreshAll();
      showToast("Lead converted successfully", "success");
      setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" });
    } catch (e: any) {
      console.error('Submit sale amount error:', e);
      showToast(e.message || "Failed to convert lead", "error");
    }
  }

  async function deleteLead(id: string) {
    const lead = leads.find(l => l.id === id);
    setConfirmModal({
      open: true,
      title: "Delete Lead",
      message: `Are you sure you want to delete "${
        lead?.name || "this lead"
      }"? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Delete failed");
          await fetchLeads();
          showToast("Lead deleted successfully", "success");
        } catch (e) {
          showToast("Failed to delete lead", "error");
        }
      },
    });
  }

  const followUpDue = leads.filter(
    (lead) => lead.followUpDate && isFollowUpDue(lead.followUpDate)
  );

  const filteredLeads = useMemo(() => leads, [leads]);

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Top */}
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="text-sm text-gray-500">
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleString()}`
              : "Not refreshed yet"}
          </div>
        </div>

        {/* Current Month Sales Rankings Marquee */}
        {isLoading ? (
          <SkeletonMarquee />
        ) : topPerformer?.rankings && topPerformer.rankings.length > 0 ? (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg overflow-hidden shadow-md">
          <div className="px-4 py-2 bg-yellow-100 border-b border-yellow-300">
            <h3 className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
              <span>🏆</span>
              Current Month Rankings - {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="relative h-16 flex items-center">
            <div className="absolute whitespace-nowrap animate-marquee flex items-center gap-8 px-4">
              {topPerformer?.rankings && topPerformer.rankings.length > 0 ? (
                <>
                  {topPerformer.rankings.map((ranking: any) => (
                    <div key={ranking.user.id} className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm">
                      <span className="font-bold text-lg">
                        {ranking.rank === 1 ? '🥇' : ranking.rank === 2 ? '🥈' : ranking.rank === 3 ? '🥉' : `#${ranking.rank}`}
                      </span>
                      <span className="font-semibold text-gray-900">{ranking.user.name}</span>
                      <span className="text-yellow-700 font-medium">
                        ₹{Number(ranking.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-600">
                        ({ranking.totalSales} {ranking.totalSales === 1 ? 'sale' : 'sales'})
                      </span>
                    </div>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {topPerformer.rankings.map((ranking: any) => (
                    <div key={`dup-${ranking.user.id}`} className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm">
                      <span className="font-bold text-lg">
                        {ranking.rank === 1 ? '🥇' : ranking.rank === 2 ? '🥈' : ranking.rank === 3 ? '🥉' : `#${ranking.rank}`}
                      </span>
                      <span className="font-semibold text-gray-900">{ranking.user.name}</span>
                      <span className="text-yellow-700 font-medium">
                        ₹{Number(ranking.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-600">
                        ({ranking.totalSales} {ranking.totalSales === 1 ? 'sale' : 'sales'})
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-gray-600 px-4">No sales data available yet</div>
              )}
            </div>
          </div>
        </div>
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard 
                title="Total Leads" 
                value={leads.length}
                icon={<Target className="w-6 h-6 text-blue-600" />}
                gradient
              />
              <StatCard
                title="Active Leads"
                value={leads.filter((l) => !l.public).length}
                icon={<UserCheck className="w-6 h-6 text-green-600" />}
              />
              <StatCard
                title="Public Pool"
                value={leads.filter((l) => l.public).length}
                icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
              />
              <StatCard 
                title="Sales Team" 
                value={users.length}
                icon={<Users className="w-6 h-6 text-purple-600" />}
              />
            </>
          )}
        </div>

        {/* Historical Rankings Section */}
        {!isLoading && rankingHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span>
              Previous Months Performance
            </h2>
            <div className="space-y-6">
              {rankingHistory.map((monthData: any) => (
                <div key={`${monthData.year}-${monthData.month}`} className="border-b last:border-b-0 pb-4 last:pb-0">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {new Date(monthData.year, monthData.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {monthData.rankings.slice(0, 5).map((ranking: any) => (
                      <div 
                        key={ranking.user.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          ranking.rank === 1 ? 'bg-yellow-50 border border-yellow-200' :
                          ranking.rank === 2 ? 'bg-gray-50 border border-gray-200' :
                          ranking.rank === 3 ? 'bg-orange-50 border border-orange-200' :
                          'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {ranking.rank === 1 ? '🥇' : ranking.rank === 2 ? '🥈' : ranking.rank === 3 ? '🥉' : `#${ranking.rank}`}
                          </span>
                          <span className="font-medium text-gray-900">{ranking.user.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            ₹{Number(ranking.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {ranking.totalSales} {ranking.totalSales === 1 ? 'sale' : 'sales'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up reminders */}
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonLeadCard />
            <SkeletonLeadCard />
          </div>
        ) : followUpDue.length > 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 mb-3">
              ⚠️ Follow-up Reminders
            </h2>
            <div className="space-y-2">
              {followUpDue.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white border border-yellow-300 rounded-lg p-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{lead.name}</h3>
                      <p className="text-sm text-gray-600">{lead.email}</p>
                      <p className="text-sm text-gray-500">
                        Phone: {lead.phone}
                      </p>
                      <p className="text-sm text-gray-500 font-semibold">
                        Assigned to:{" "}
                        {users.find((u) => u.id === lead.assignedTo)?.name ||
                          "Unassigned"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          isFollowUpOverdue(lead.followUpDate)
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {isFollowUpOverdue(lead.followUpDate)
                          ? "OVERDUE"
                          : "Due Today"}
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
        ) : null}

        {/* Create + Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Lead Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Lead</h2>
            <form onSubmit={submitLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter lead name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Country</option>
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="China">China</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Singapore">Singapore</option>
                  <option value="UAE">UAE</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Sales Person
                </label>
                <select
                  value={form.assignedTo}
                  onChange={(e) =>
                    setForm({ ...form, assignedTo: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Comment
                </label>
                <textarea
                  value={form.adminComment}
                  onChange={(e) =>
                    setForm({ ...form, adminComment: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg resize-none"
                  placeholder="Add context for the sales team about this lead..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This comment will be visible to the assigned sales person
                </p>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? "Creating..." : "Create Lead"}
              </button>
            </form>
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
            {isLoading ? (
              <SkeletonTable rows={5} />
            ) : (
            <>
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="min-w-full whitespace-nowrap">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Assigned To</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.slice(0, 12).map((lead) => {
                      const assignedUser = users.find(
                        (u) => u.id === lead.assignedTo
                      );
                      return (
                        <tr key={lead.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <Link
                              href="/admin/leads"
                              className=" hover:text-orange-800"
                            >
                              {lead.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {assignedUser ? assignedUser.name : "Unassigned"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                lead.public
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {lead.public ? "Public" : "Active"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => deleteLead(lead.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredLeads.length > 12 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/admin/leads"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View All Leads
                  </Link>
                </div>
              )}
            </>
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

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        variant={confirmModal.variant}
      />
    </DashboardLayout>
  );
}
