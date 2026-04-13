"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/date";
import { Lead } from "@/types";
import { Modal, Button, ConfirmModal } from "@/components/ui";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonLeadCard } from "@/components/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import { Input, Textarea, Select } from "@/components/FormInputs";
import { Mail, Phone, User, Building, Calendar } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

export default function TeamLeaderMyLeadsPage() {
  const { user, loading } = useAuth("team_leader");
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
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
  const [viewNotesOpen, setViewNotesOpen] = useState(false);
  const [viewNotesLead, setViewNotesLead] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<string>("");
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
      setIsLoadingLeads(true);
      fetchMyLeads().finally(() => setIsLoadingLeads(false));
    }
  }, [user]);

  async function fetchMyLeads() {
    const res = await fetch(`/api/leads?assigned=${user?.id}`);
    const data = await res.json();
    setLeads(data.leads || []);
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
      showToast("Note added successfully", "success");
      fetchMyLeads();
    } catch (error) {
      showToast("Failed to add note", "error");
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
      showToast("Follow-up date set successfully", "success");
      fetchMyLeads();
    } catch (error) {
      showToast("Failed to set follow-up date", "error");
    } finally {
      setIsSubmittingFollowUp(false);
    }
  }

  async function makePublic(id: string) {
    const lead = leads.find((l) => l.id === id);
    setConfirmModal({
      open: true,
      title: "Move Lead to Public Pool",
      message: `Are you sure you want to move "${
        lead?.name || "this lead"
      }" to the public pool? This will make it visible to all team members.`,
      variant: "warning",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, open: false }));
        const response = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, setPublic: true }),
        });
        if (response.ok) {
          showToast("Lead moved to public pool", "success");
        } else {
          showToast("Failed to move lead to public pool", "error");
        }
        fetchMyLeads();
      },
    });
  }

  function openViewNotes(lead: Lead) {
    setViewNotesLead(lead);
    setViewNotesOpen(true);
  }

  function openEditModal(lead: Lead) {
    setOriginalStatus((lead as any).status || "NEW");
    setEditLead({
      id: lead.id,
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: (lead as any).company || "",
      status: (lead as any).status || "NEW",
      priority: (lead as any).priority || "MEDIUM",
      followUpDate: (lead as any).followUpDate
        ? String((lead as any).followUpDate).slice(0, 10)
        : "",
      adminComment: (lead as any).adminComment || "",
    });
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editLead) return;

    if (originalStatus !== "CONVERTED" && editLead.status === "CONVERTED") {
      setEditOpen(false);
      const leadName = editLead.name || "this lead";
      setSaleAmountModal({
        open: true,
        leadId: editLead.id,
        leadName: leadName,
        saleAmount: "",
      });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const response = await fetch(`/api/leads/${editLead.id}`, {
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
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update lead");
      }
      await fetchMyLeads();
      setEditOpen(false);
      setEditLead(null);
      showToast("Lead updated successfully", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to update lead", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  async function submitSaleAmount() {
    if (!saleAmountModal.leadId) return;

    const saleAmount = parseFloat(saleAmountModal.saleAmount);
    if (isNaN(saleAmount) || saleAmount < 0) {
      showToast("Please enter a valid sale amount", "error");
      return;
    }

    try {
      const response = await fetch(`/api/leads/${saleAmountModal.leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editLead?.name,
          email: editLead?.email,
          phone: editLead?.phone,
          company: editLead?.company,
          status: "CONVERTED",
          priority: editLead?.priority,
          followUpDate: editLead?.followUpDate || null,
          saleAmount: saleAmount,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to convert lead");
      }

      await fetchMyLeads();
      setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" });
      setEditLead(null);
      showToast("Lead converted successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to convert lead. Please try again.", "error");
    }
  }

  const filtered = useMemo(() => {
    return leads
      .filter(
        (lead) =>
          (!query ||
            lead.name.toLowerCase().includes(query.toLowerCase()) ||
            (lead.email || "").toLowerCase().includes(query.toLowerCase()) ||
            (lead.phone || "").toLowerCase().includes(query.toLowerCase())) &&
          (statusFilter === "all" ||
            String(lead.status).toUpperCase() === statusFilter)
      )
      .sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [leads, query, statusFilter, sortOrder]);

  if (loading) {
    return <LoadingScreen message="Loading your leads..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType="team_leader">
      <div className="space-y-6 text-black">
        <div className="bg-white rounded-lg shadow-sm p-4">
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
              onClick={fetchMyLeads}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">My Leads</h2>
          {isLoadingLeads ? (
            <div className="grid gap-4">
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
            </div>
          ) : (
          <div className="grid gap-4">
            {filtered.length === 0 && (
              <p className="text-gray-500 text-center py-8">No leads found</p>
            )}
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="border rounded-lg p-3 sm:p-4 flex flex-col hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <div>
                    <h3 className="font-medium">{lead.name}</h3>
                    <p className="text-sm text-gray-500 break-all">
                      {lead.email}
                    </p>
                    {(lead as any).adminComment && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs font-semibold text-amber-800 mb-1">💡 Admin Comment:</p>
                        <p className="text-sm text-amber-900">{(lead as any).adminComment}</p>
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
                      onClick={() => openEditModal(lead)}
                      className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition-colors w-full sm:w-auto"
                    >
                      Edit
                    </button>
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

                  {/* Notes Section */}
                  <div className="mt-2">
                    <div className="text-gray-700 font-medium">Notes</div>
                    <div className="max-h-28 overflow-auto space-y-2 pr-1">
                      {(lead.notes || [])
                        .slice()
                        .reverse()
                        .slice(0, 3)
                        .map((n: any) => (
                          <div
                            key={n.id}
                            className="bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 text-sm"
                          >
                            {n.text}
                          </div>
                        ))}
                      {(lead.notes?.length || 0) === 0 && (
                        <div className="text-gray-400 text-sm">
                          No notes yet
                        </div>
                      )}
                    </div>

                    {(lead.notes?.length || 0) > 3 && (
                      <button
                        onClick={() => openViewNotes(lead)}
                        className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
                      >
                        View all notes ({lead.notes?.length})
                      </button>
                    )}
                  </div>

                  <div className="mt-1">
                    Added: {formatDate(lead.createdAt)}
                    {(lead as any).country && ` • ${(lead as any).country}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Added by: {(lead as any).createdByUser?.name || "System"}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={(lead as any).status || "NEW"} />
                    <PriorityBadge priority={(lead as any).priority || "MEDIUM"} />
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
          )}
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
        <Textarea
          label="Note"
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value);
            if (noteError) setNoteError("");
          }}
          placeholder="Type your note here"
          rows={4}
          error={noteError}
          required
        />
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
        <Input
          type="date"
          label="Follow-up Date"
          value={followUpDate}
          onChange={(e) => {
            setFollowUpDate(e.target.value);
            if (followUpError) setFollowUpError("");
          }}
          min={new Date().toISOString().slice(0, 10)}
          error={followUpError}
          icon={Calendar}
          required
        />
      </Modal>

      {/* View All Notes Modal */}
      <Modal
        open={viewNotesOpen}
        title={
          viewNotesLead ? `All Notes — ${viewNotesLead.name}` : "All Notes"
        }
        onClose={() => {
          setViewNotesOpen(false);
          setViewNotesLead(null);
        }}
        actions={
          <>
            <Button
              onClick={() => {
                setViewNotesOpen(false);
                setViewNotesLead(null);
              }}
            >
              Close
            </Button>
          </>
        }
      >
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {(viewNotesLead?.notes || [])
            .slice()
            .reverse()
            .map((n: any) => (
              <div
                key={n.id}
                className="bg-gray-50 border border-gray-200 rounded p-3"
              >
                <div className="text-gray-800 whitespace-pre-wrap">
                  {n.text}
                </div>
              </div>
            ))}
          {(viewNotesLead?.notes?.length || 0) === 0 && (
            <div className="text-gray-400">No notes yet</div>
          )}
        </div>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        open={editOpen}
        title="Edit Lead"
        onClose={() => {
          setEditOpen(false);
          setEditLead(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
                setEditLead(null);
              }}
              disabled={isSubmittingEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={isSubmittingEdit}
            >
              {isSubmittingEdit ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </>
        }
      >
        {editLead && (
          <div className="space-y-4">
            <Input
              type="text"
              label="Name"
              value={editLead.name}
              onChange={(e) => setEditLead({ ...editLead, name: e.target.value })}
              icon={User}
              required
            />
            <Input
              type="email"
              label="Email"
              value={editLead.email}
              onChange={(e) => setEditLead({ ...editLead, email: e.target.value })}
              icon={Mail}
            />
            <Input
              type="tel"
              label="Phone"
              value={editLead.phone}
              onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })}
              icon={Phone}
            />
            <Input
              type="text"
              label="Company"
              value={editLead.company}
              onChange={(e) => setEditLead({ ...editLead, company: e.target.value })}
              icon={Building}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Status"
                value={editLead.status}
                onChange={(e) =>
                  setEditLead({ ...editLead, status: e.target.value })
                }
                options={[
                  { value: "NEW", label: "New" },
                  { value: "CONTACTED", label: "Contacted" },
                  { value: "INTERESTED", label: "Interested" },
                  { value: "CONVERTED", label: "Converted" }
                ]}
              />
              <Select
                label="Priority"
                value={editLead.priority}
                onChange={(e) =>
                  setEditLead({ ...editLead, priority: e.target.value })
                }
                options={[
                  { value: "LOW", label: "Low" },
                  { value: "MEDIUM", label: "Medium" },
                  { value: "HIGH", label: "High" }
                ]}
              />
            </div>
            <Input
              type="date"
              label="Follow-up Date"
              value={editLead.followUpDate}
              onChange={(e) =>
                setEditLead({ ...editLead, followUpDate: e.target.value })
              }
              icon={Calendar}
            />
          </div>
        )}
      </Modal>

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
              <Button
                variant="secondary"
                onClick={() => setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" })}
              >
                Cancel
              </Button>
              <Button onClick={submitSaleAmount}>
                Convert Lead
              </Button>
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
