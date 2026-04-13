"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate, isFollowUpDue, isFollowUpOverdue } from "@/utils/date";
import StatCard from "@/components/StatCard";
import { Lead } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Modal, Button, ConfirmModal } from "@/components/ui";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonLeadCard, SkeletonMarquee, SkeletonStatCard } from "@/components/Skeleton";
import { ClipboardList, CheckCircle, TrendingUp } from "lucide-react";

export default function SalesPage() {
  const { user, loading } = useAuth("sales");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [publicLeads, setPublicLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [noteError, setNoteError] = useState("");
  const [followUpError, setFollowUpError] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    priority: "MEDIUM",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [topPerformer, setTopPerformer] = useState<any>(null);
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
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (user) {
      setIsLoadingData(true);
      Promise.all([fetchMyLeads(), fetchPublicLeads(), fetchTopPerformer()])
        .finally(() => setIsLoadingData(false));
    }
  }, [user]);

  async function fetchMyLeads() {
    const res = await fetch(`/api/leads?assigned=${user?.id}`);
    const data = await res.json();
    setLeads(data.leads || []);
  }

  async function fetchPublicLeads() {
    const res = await fetch("/api/leads/public");
    const data = await res.json();
    setPublicLeads(data.leads || []);
  }

  async function fetchTopPerformer() {
    try {
      const res = await fetch("/api/metrics/rankings");
      const data = await res.json();
      setTopPerformer(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function markLead(
    id: string,
    status: "CONTACTED" | "CONVERTED",
    leadName?: string
  ) {
    if (status === "CONVERTED") {
      const lead = leads.find((l) => l.id === id);
      setSaleAmountModal({
        open: true,
        leadId: id,
        leadName: leadName || lead?.name || "",
        saleAmount: "",
      });
      return;
    }

    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, followUpDate: null }),
    });
    fetchMyLeads();
    fetchTopPerformer();
  }

  async function submitSaleAmount() {
    const amount = parseFloat(saleAmountModal.saleAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    try {
      console.log("Submitting sale amount:", {
        leadId: saleAmountModal.leadId,
        amount,
        status: "CONVERTED",
      });
      const res = await fetch(`/api/leads/${saleAmountModal.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONVERTED",
          saleAmount: amount,
          followUpDate: null,
        }),
      });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "Failed to update");
      }
      const result = await res.json();
      console.log("Success result:", result);
      fetchMyLeads();
      fetchTopPerformer();
      setSaleAmountModal({
        open: false,
        leadId: "",
        leadName: "",
        saleAmount: "",
      });
    } catch (e: any) {
      console.error("Submit sale amount error:", e);
      alert(e.message || "Failed to convert lead");
    }
  }

  function openAddNote(leadId: string) {
    setActiveLeadId(leadId);
    setNoteText("");
    setNoteModalOpen(true);
  }

  async function submitNote() {
    const trimmed = noteText.trim();
    if (!trimmed || trimmed.length < 2) {
      setNoteError("Please enter at least 2 characters.");
      return;
    }
    if (!activeLeadId || !user?.id) return;

    setIsSubmittingNote(true);
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeLeadId,
          addNote: { text: trimmed, by: user.id },
        }),
      });
      setNoteModalOpen(false);
      setActiveLeadId(null);
      setNoteText("");
      setNoteError("");
      fetchMyLeads();
    } finally {
      setIsSubmittingNote(false);
    }
  }

  function openFollowUp(leadId: string) {
    setActiveLeadId(leadId);
    setFollowUpDate("");
    setFollowUpModalOpen(true);
  }

  async function submitFollowUp() {
    if (!followUpDate) {
      setFollowUpError("Please choose a date.");
      return;
    }
    const selected = new Date(followUpDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      setFollowUpError("Date cannot be in the past.");
      return;
    }
    if (!activeLeadId) return;

    setIsSubmittingFollowUp(true);
    try {
      await fetch(`/api/leads/${activeLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate }),
      });
      setFollowUpModalOpen(false);
      setActiveLeadId(null);
      setFollowUpDate("");
      setFollowUpError("");
      fetchMyLeads();
    } finally {
      setIsSubmittingFollowUp(false);
    }
  }

  async function makePublic(id: string) {
    const lead = [...leads, ...publicLeads].find((l) => l.id === id);
    setConfirmModal({
      open: true,
      title: "Move Lead to Public Pool",
      message: `Are you sure you want to move "${
        lead?.name || "this lead"
      }" to the public pool? This will make it visible to all sales team members.`,
      variant: "warning",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, setPublic: true }),
        });
        fetchMyLeads();
        fetchPublicLeads();
      },
    });
  }

  async function claimLead(leadId: string) {
    if (!user?.id) return;
    await fetch(`/api/leads/${leadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    await Promise.all([fetchMyLeads(), fetchPublicLeads()]);
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assignedTo: user.id, // Auto-assign to current sales user
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to create lead");
      }

      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        country: "",
        priority: "MEDIUM",
      });
      await fetchMyLeads();
    } catch (e: any) {
      console.error("Create lead error:", e);
      alert(e.message || "Failed to create lead");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout userType="sales">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="flex-1 border rounded-lg px-3 py-2 text-black"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-black"
          >
            <option value="all">All statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="CONVERTED">Converted</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="border rounded-lg px-3 py-2 text-black"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button
            onClick={() => {
              fetchMyLeads();
              fetchPublicLeads();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Sales Rankings Marquee */}
      {isLoadingData ? (
        <div className="mb-6"><SkeletonMarquee /></div>
      ) : topPerformer?.rankings && topPerformer.rankings.length > 0 ? (
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg overflow-hidden shadow-md mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoadingData ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard 
              title="My Leads" 
              value={leads.length}
              icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
              gradient
            />
            <StatCard 
              title="Public Pool" 
              value={publicLeads.length}
              icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
            />
            <StatCard
              title="With Notes"
              value={leads.filter((l) => (l.notes?.length || 0) > 0).length}
              icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            />
          </>
        )}
      </div>

      {/* Reminders Section */}
      {isLoadingData ? (
        <div className="mb-6"><SkeletonLeadCard /></div>
      ) : leads.filter(
        (lead) => lead.followUpDate && isFollowUpDue(lead.followUpDate)
      ).length > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            ⚠️ Follow-up Reminders
          </h2>
          <div className="space-y-2">
            {leads
              .filter(
                (lead) => lead.followUpDate && isFollowUpDue(lead.followUpDate)
              )
              .map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white border border-yellow-300 rounded-lg p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{lead.name}</h3>
                      <p className="text-sm text-gray-600">{lead.email}</p>
                      <p className="text-sm text-gray-500">
                        Phone: {lead.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          isFollowUpOverdue(lead.followUpDate!)
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {isFollowUpOverdue(lead.followUpDate!)
                          ? "OVERDUE"
                          : "Due Today"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Follow-up: {formatDate(lead.followUpDate!)}
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          onClick={() => markLead(lead.id, "CONTACTED")}
                          className="px-3 py-1 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Called
                        </button>
                        <button
                          onClick={() =>
                            markLead(lead.id, "CONVERTED", lead.name)
                          }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Leads */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">My Leads</h2>
          {isLoadingData ? (
            <div className="grid gap-4">
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
            </div>
          ) : (
          <div className="overflow-hidden">
            <div className="grid gap-4">
              {leads
                .filter(
                  (lead) =>
                    (!query ||
                      lead.name.toLowerCase().includes(query.toLowerCase()) ||
                      (lead.email || "")
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                      (lead.phone || "")
                        .toLowerCase()
                        .includes(query.toLowerCase())) &&
                    (statusFilter === "all" ||
                      String(lead.status).toUpperCase() === statusFilter)
                )
                .sort((a, b) =>
                  sortOrder === "newest"
                    ? new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                    : new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                )
                .map((lead) => (
                  <div
                    key={lead.id}
                    className="border rounded-lg p-3 sm:p-4 flex flex-col"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                      <div>
                        <h3 className="font-medium">{lead.name}</h3>
                        <p className="text-sm text-gray-500 break-all">
                          {lead.email}
                        </p>
                        {(lead as any).adminComment && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs font-semibold text-amber-800 mb-1">
                              💡 Admin Comment:
                            </p>
                            <p className="text-sm text-amber-900">
                              {(lead as any).adminComment}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <a
                          href={`tel:${lead.phone}`}
                          className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-emerald-700 transition-colors w-full sm:w-auto text-center"
                        >
                          Call
                        </a>
                        <button
                          onClick={() => openAddNote(lead.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        >
                          Add Note
                        </button>
                        <button
                          onClick={() => openFollowUp(lead.id)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 transition-colors w-full sm:w-auto"
                        >
                          Set Follow-up
                        </button>
                        <button
                          onClick={() => makePublic(lead.id)}
                          className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-700 transition-colors w-full sm:w-auto"
                        >
                          Make Public
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Phone: {lead.phone}</div>
                      <div>Notes: {lead.notes?.length || 0}</div>
                      <div>
                        Added: {formatDate(lead.createdAt)}
                        {(lead as any).country && ` • ${(lead as any).country}`}
                      </div>
                      <div>Added by: {(lead as any).createdByUser?.name || "System"}</div>
                      <div>
                        Status:{" "}
                        <span className="capitalize">
                          {String(lead.status).toLowerCase()}
                        </span>
                      </div>
                      {lead.followUpDate && (
                        <div className="text-orange-600 font-medium">
                          Follow-up: {formatDate(lead.followUpDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          )}
        </div>

        {/* Add Lead Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">
            Add New Lead
          </h2>
          <form onSubmit={submitLead} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
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
                type="email"
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
                type="tel"
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
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
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
                onChange={(e) => setForm({ ...form, country: e.target.value })}
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
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Creating...
                </>
              ) : (
                "Add Lead"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Public Pool Section */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4">
          Public Lead Pool
        </h2>
        <div className="overflow-hidden">
          <div className="grid gap-4">
            {publicLeads
              .filter(
                (lead) =>
                  !query ||
                  lead.name.toLowerCase().includes(query.toLowerCase()) ||
                  (lead.email || "")
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                  (lead.phone || "").toLowerCase().includes(query.toLowerCase())
              )
              .sort((a, b) =>
                sortOrder === "newest"
                  ? new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                  : new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
              )
              .map((lead) => (
                <div
                  key={lead.id}
                  className="border rounded-lg p-3 sm:p-4 flex flex-col"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                    <div>
                      <h3 className="font-medium">{lead.name}</h3>
                      <p className="text-sm text-gray-500 break-all">
                        {lead.email}
                      </p>
                    </div>
                    <button
                      onClick={() => claimLead(lead.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors w-full sm:w-auto"
                    >
                      Claim Lead
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Phone: {lead.phone}</div>
                    <div>
                      Added: {formatDate(lead.createdAt)}
                      {(lead as any).country && ` • ${(lead as any).country}`}
                    </div>
                    <div>Added by: {(lead as any).createdByUser?.name || "System"}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      <Modal
        open={noteModalOpen}
        title="Add Note"
        onClose={() => {
          setNoteModalOpen(false);
          setActiveLeadId(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setNoteModalOpen(false);
                setActiveLeadId(null);
              }}
              disabled={isSubmittingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={submitNote}
              disabled={!noteText.trim() || isSubmittingNote}
            >
              {isSubmittingNote ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save Note"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Note</label>
          <textarea
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              if (noteError) setNoteError("");
            }}
            placeholder="Type your note here"
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg text-black ${
              noteError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {noteError && <p className="text-sm text-red-600">{noteError}</p>}
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        open={followUpModalOpen}
        title="Set Follow-up Date"
        onClose={() => {
          setFollowUpModalOpen(false);
          setActiveLeadId(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setFollowUpModalOpen(false);
                setActiveLeadId(null);
              }}
              disabled={isSubmittingFollowUp}
            >
              Cancel
            </Button>
            <Button
              onClick={submitFollowUp}
              disabled={!followUpDate || isSubmittingFollowUp}
            >
              {isSubmittingFollowUp ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Follow-up Date
          </label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => {
              setFollowUpDate(e.target.value);
              if (followUpError) setFollowUpError("");
            }}
            min={new Date().toISOString().slice(0, 10)}
            className={`px-3 py-2 border rounded-lg text-black ${
              followUpError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {followUpError && (
            <p className="text-sm text-red-600">{followUpError}</p>
          )}
        </div>
      </Modal>

      {/* Sale Amount Modal */}
      {saleAmountModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Convert Lead
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the sale amount for{" "}
              <span className="font-medium">{saleAmountModal.leadName}</span>
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
                onChange={(e) =>
                  setSaleAmountModal({
                    ...saleAmountModal,
                    saleAmount: e.target.value,
                  })
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setSaleAmountModal({
                    open: false,
                    leadId: "",
                    leadName: "",
                    saleAmount: "",
                  })
                }
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

      {/* Confirm Modal */}
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
