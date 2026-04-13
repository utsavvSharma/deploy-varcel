"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Button from "@/components/Button";
import { useToast } from "@/contexts/ToastContext";
import { useLoading } from "@/components/LoadingOverlay";
import { formatDate, formatDateTime } from "@/utils/date";
import { Modal, ConfirmModal } from "@/components/ui";
import { Input, Textarea, Select } from "@/components/FormInputs";
import { Mail, Phone, User as UserIcon, Building, Calendar, MessageSquare } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonLeadCard } from "@/components/Skeleton";

type Lead = any;
type TeamMember = { id: string; name: string; email?: string };

export default function TeamLeaderLeadsPage() {
  const { user, loading: authLoading } = useAuth("team_leader");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
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

  // Add lead form
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    priority: "MEDIUM",
    assignedTo: "",
  });

  const { showToast } = useToast();
  const { withLoading } = useLoading();
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (user) {
      setIsLoadingLeads(true);
      Promise.all([fetchTeamLeads(), fetchTeamMembers()]).finally(() =>
        setIsLoadingLeads(false)
      );
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMemberId, statusFilter, searchQuery]);

  async function fetchTeamLeads() {
    try {
      const res = await fetch("/api/teams/leads");
      const data = await res.json();
      setLeads(data.leads || []);
      if (data.teamMembers) {
        setTeamMembers(data.teamMembers);
      }
    } catch (e) {
      console.error("Error fetching team leads:", e);
      showToast("Failed to fetch leads", "error");
    }
  }

  async function fetchTeamMembers() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeamMembers(data.teamMembers || []);
    } catch (e) {
      console.error("Error fetching team members:", e);
    }
  }

  async function assignLead(leadId: string, userId: string | null) {
    try {
      const response = await withLoading(
        fetch(`/api/leads/${leadId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }),
        "Assigning lead..."
      );
      if (!response.ok) throw new Error("Failed to assign lead");
      await fetchTeamLeads();
      const assignedUser = teamMembers.find((u) => u.id === userId);
      showToast(`Lead assigned to ${assignedUser?.name || "Unassigned"}`);
    } catch (error) {
      showToast("Failed to assign lead", "error");
    }
  }

  function openEditModal(lead: Lead) {
    setEditLead({
      id: lead.id,
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      status: lead.status || "NEW",
      priority: lead.priority || "MEDIUM",
      followUpDate: lead.followUpDate
        ? String(lead.followUpDate).slice(0, 10)
        : "",
      adminComment: lead.adminComment || "",
    });
    setEditOpen(true);
  }

  async function submitEdit() {
    if (
      editLead.status === "CONVERTED" &&
      leads.find((l) => l.id === editLead.id)?.status !== "CONVERTED"
    ) {
      setSaleAmountModal({
        open: true,
        leadId: editLead.id,
        leadName: editLead.name,
        saleAmount: "",
      });
      setEditOpen(false);
      return;
    }

    try {
      const response = await withLoading(
        fetch(`/api/leads/${editLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editLead.name,
            email: editLead.email,
            phone: editLead.phone,
            company: editLead.company,
            status: editLead.status,
            priority: editLead.priority,
            followUpDate: editLead.followUpDate || null,
            adminComment: editLead.adminComment,
          }),
        }),
        "Updating lead..."
      );
      if (!response.ok) throw new Error("Failed to update");
      setEditOpen(false);
      await fetchTeamLeads();
      showToast("Lead updated successfully");
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
        body: JSON.stringify({
          status: "CONVERTED",
          saleAmount: amount,
          followUpDate: null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" });
      await fetchTeamLeads();
      showToast("Lead converted successfully");
    } catch (e) {
      showToast("Failed to convert lead", "error");
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
      showToast("Please enter at least 2 characters", "error");
      return;
    }
    if (!activeLeadId || !user?.id) return;

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
      await fetchTeamLeads();
      showToast("Note added");
    } catch (e) {
      showToast("Failed to add note", "error");
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await withLoading(
        fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        "Creating lead..."
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed" }));
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
      });
      setShowAddForm(false);
      await fetchTeamLeads();
      showToast("Lead created successfully");
    } catch (e: any) {
      showToast(e.message || "Failed to create lead", "error");
    }
  }

  // Filtering
  const filtered = leads.filter((lead: Lead) => {
    if (filterMemberId && lead.assignedTo !== filterMemberId) return false;
    if (statusFilter !== "all" && String(lead.status).toUpperCase() !== statusFilter.toUpperCase())
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        lead.name?.toLowerCase().includes(q) ||
        lead.email?.toLowerCase().includes(q) ||
        lead.phone?.includes(q) ||
        lead.company?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (authLoading) return <LoadingScreen message="Loading..." />;
  if (!user) return null;

  return (
    <DashboardLayout userType="team_leader">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h1 className="text-2xl font-semibold">Team Leads</h1>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ Add Lead"}
          </Button>
        </div>

        {/* Add Lead Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Lead</h2>
            <form onSubmit={submitLead} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Create Lead</Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            <select
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Members</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500">
          Showing {paginated.length} of {filtered.length} leads
        </div>

        {/* Leads List */}
        <div className="space-y-4">
          {isLoadingLeads ? (
            <>
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
            </>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No leads found
            </div>
          ) : (
            <>
          {paginated.map((lead: Lead) => (
            <div key={lead.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.priority === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : lead.priority === "MEDIUM"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {lead.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    {lead.email && <p>{lead.email}</p>}
                    {lead.phone && <p>{lead.phone}</p>}
                    {lead.company && <p>{lead.company}</p>}
                    <p>
                      Assigned to:{" "}
                      <span className="font-medium">
                        {lead.assignedUser?.name || "Unknown"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Created {formatDate(lead.createdAt)}
                    </p>
                  </div>

                  {/* Notes */}
                  {lead.notes && lead.notes.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Notes ({lead.notes.length})
                      </p>
                      {lead.notes.slice(-2).map((note: any, idx: number) => (
                        <p key={idx} className="text-xs text-gray-600">
                          &bull; {note.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Reassign dropdown */}
                  <select
                    value={lead.assignedTo || ""}
                    onChange={(e) => assignLead(lead.id, e.target.value || null)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="">Unassign</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => openEditModal(lead)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openAddNote(lead.id)}>
                    Note
                  </Button>
                </div>
              </div>
            </div>
          ))}

            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Edit Lead Modal */}
      {editOpen && editLead && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={editLead.name}
                  onChange={(e) => setEditLead({ ...editLead, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={editLead.email}
                    onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={editLead.phone}
                    onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  value={editLead.company}
                  onChange={(e) => setEditLead({ ...editLead, company: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editLead.status}
                    onChange={(e) => setEditLead({ ...editLead, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="CONVERTED">Converted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={editLead.priority}
                    onChange={(e) => setEditLead({ ...editLead, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={editLead.followUpDate}
                  onChange={(e) => setEditLead({ ...editLead, followUpDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                  value={editLead.adminComment}
                  onChange={(e) => setEditLead({ ...editLead, adminComment: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={submitEdit}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Add Note</h2>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setNoteModalOpen(false)}>Cancel</Button>
              <Button onClick={submitNote}>Save Note</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Amount Modal */}
      {saleAmountModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Convert Lead</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the sale amount for <strong>{saleAmountModal.leadName}</strong>
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={saleAmountModal.saleAmount}
              onChange={(e) =>
                setSaleAmountModal({ ...saleAmountModal, saleAmount: e.target.value })
              }
              placeholder="Sale amount"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" })
                }
              >
                Cancel
              </Button>
              <Button onClick={submitSaleAmount}>Convert</Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.open && (
        <ConfirmModal          open={confirmModal.open}          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        />
      )}
    </DashboardLayout>
  );
}
