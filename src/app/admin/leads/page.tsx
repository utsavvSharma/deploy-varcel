"use client";

import { useState, useEffect } from "react";
import { User, Lead } from "@/types";
import DashboardLayout from "@/components/DashboardLayout";
import Button from "@/components/Button";
import { useToast } from "@/contexts/ToastContext";
import { useLoading } from "@/components/LoadingOverlay";
import { formatDate, formatDateTime } from "@/utils/date";
import { Modal, ConfirmModal } from "@/components/ui";
import { Input, Textarea, Select } from "@/components/FormInputs";
import { Mail, Phone, User as UserIcon, Building, Calendar, MessageSquare } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { SkeletonLeadCard } from "@/components/Skeleton";

export default function ManageLeadsPage() {
  const [view, setView] = useState<"assigned" | "unassigned" | "public">(
    "assigned"
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
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
    variant?: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const { showToast } = useToast();
  const { withLoading } = useLoading();
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setIsLoadingLeads(true);
    Promise.all([fetchLeads(), fetchUsers()]).finally(() =>
      setIsLoadingLeads(false)
    );
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [view, filterUserId, statusFilter, searchQuery]);

  async function fetchLeads() {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads || []);
  }

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    // Filter out admin users and only show sales team members
    setUsers(data.users?.filter((u: User) => u.role === "sales" || u.role === "team_leader") || []);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign lead");
      }

      await fetchLeads();
      const assignedUser = users.find(u => u.id === userId);
      showToast(`Lead assigned to ${assignedUser?.name || 'Unassigned'}`);
    } catch (error) {
      console.error("Error assigning lead:", error);
      showToast("Failed to assign lead", "error");
    }
  }

  async function makePublic(leadId: string) {
    const lead = leads.find(l => l.id === leadId);
    setConfirmModal({
      open: true,
      title: "Move Lead to Public Pool",
      message: `Are you sure you want to move "${lead?.name || 'this lead'}" to the public pool? This will make it visible to all sales team members.`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const response = await withLoading(
            fetch(`/api/leads/public`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: leadId }),
            }),
            "Moving lead to public pool..."
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to move lead to public pool");
          }

          await fetchLeads();
          showToast("Lead moved to public pool");
        } catch (error) {
          console.error("Error moving lead to public pool:", error);
          showToast("Failed to move lead to public pool", "error");
        }
      }
    });
  }

  async function deleteLead(leadId: string) {
    const lead = leads.find(l => l.id === leadId);
    setConfirmModal({
      open: true,
      title: "Delete Lead",
      message: `Are you sure you want to delete "${lead?.name || 'this lead'}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const response = await withLoading(
            fetch(`/api/leads/${leadId}`, {
              method: "DELETE",
            }),
            "Deleting lead..."
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete lead");
          }
          await fetchLeads();
          showToast("Lead deleted successfully");
        } catch (error) {
          console.error("Error deleting lead:", error);
          showToast("Failed to delete lead", "error");
        }
      }
    });
  }

  function openEditModal(lead: Lead) {
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
    setOriginalStatus((lead as any).status || "NEW");
    setEditOpen(true);
  }

  async function submitEdit() {
    // Check if status changed to CONVERTED
    if (editLead.status === "CONVERTED" && originalStatus !== "CONVERTED") {
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
            adminComment: editLead.adminComment || null,
          }),
        }),
        "Updating lead..."
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update lead");
      }
      await fetchLeads();
      setEditOpen(false);
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
      const response = await withLoading(
        fetch(`/api/leads/${saleAmountModal.leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editLead,
            status: "CONVERTED",
            saleAmount: amount,
            followUpDate: null,
          }),
        }),
        "Converting lead..."
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to convert lead");
      }
      await fetchLeads();
      setSaleAmountModal({ open: false, leadId: "", leadName: "", saleAmount: "" });
      showToast("Lead converted successfully");
    } catch (e) {
      showToast("Failed to convert lead", "error");
    }
  }

  const displayedLeads = leads.filter((lead) => {
    // Apply view filter
    let viewMatch = false;
    if (view === "public") viewMatch = Boolean(lead.public);
    else if (view === "unassigned") viewMatch = !lead.assignedTo && !lead.public;
    else viewMatch = Boolean(lead.assignedTo) && !lead.public;
    
    // Apply user filter
    const userMatch = !filterUserId || lead.assignedTo === filterUserId;
    
    // Apply status filter
    const statusMatch = statusFilter === "all" || 
      String((lead as any).status || "NEW").toUpperCase() === statusFilter;
    
    // Apply search filter
    const searchMatch = !searchQuery || 
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead as any).company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return viewMatch && userMatch && statusMatch && searchMatch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(displayedLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLeads = displayedLeads.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-semibold">Manage Leads</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search input */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="text-sm border rounded-md px-3 py-1 w-48"
              />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1"
              >
                <option value="all">All</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
            {/* Team member filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Member:</label>
              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="text-sm border rounded-md px-2 py-1"
              >
                <option value="">All</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="-mb-px flex space-x-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setView("assigned")}
              className={`py-2 px-1 inline-flex items-center border-b-2 ${
                view === "assigned"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Assigned Leads
            </button>
            <button
              onClick={() => setView("unassigned")}
              className={`py-2 px-1 inline-flex items-center border-b-2 ${
                view === "unassigned"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Unassigned Leads
            </button>
            <button
              onClick={() => setView("public")}
              className={`py-2 px-1 inline-flex items-center border-b-2 ${
                view === "public"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Public Pool
            </button>
          </nav>
        </div>

        {/* Leads List */}
        <div className="bg-white shadow-sm rounded-lg">
          {isLoadingLeads ? (
            <div className="p-4 space-y-4">
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
              <SkeletonLeadCard />
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-medium">No leads found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {paginatedLeads.map((lead) => (
              <li key={lead.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{lead.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                    {lead.phone && (
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                    )}
                    {(lead as any).company && (
                      <p className="text-sm text-gray-600">Company: {(lead as any).company}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={(lead as any).status || "NEW"} />
                      <PriorityBadge priority={(lead as any).priority || "MEDIUM"} />
                    </div>
                    {(lead as any).adminComment && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Admin Comment:</p>
                        <p className="text-sm text-blue-900">{(lead as any).adminComment}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Added: {formatDate(lead.createdAt)}
                      {(lead as any).country && ` • ${(lead as any).country}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Added by: {(lead as any).createdByUser?.name || "System"}
                    </p>
                    {/* Notes */}
                    <div className="mt-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </div>
                      <div className="max-h-32 sm:max-h-28 overflow-auto border rounded-md p-2 bg-gray-50">
                        {Array.isArray((lead as any).notes) &&
                        (lead as any).notes.length > 0 ? (
                          <ul className="space-y-2">
                            {(lead as any).notes.map((n: any, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700">
                                <div className="flex justify-between">
                                  <span className="font-medium">{n.by || (n.userId ? users.find(u => u.id === n.userId)?.name || n.userId : "unknown")}</span>
                                  <span className="text-xs text-gray-400">
                                    {formatDateTime(n.createdAt || n.date)}
                                  </span>
                                </div>
                                <div>{n.text}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-gray-500">No note</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-3 sm:mt-0">
                    <select
                      value={lead.assignedTo || ""}
                      onChange={(e) =>
                        assignLead(lead.id, e.target.value || null)
                      }
                      className="text-sm border rounded-md px-2 py-1 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(lead)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => deleteLead(lead.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </Button>
                    {!lead.public && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => makePublic(lead.id)}
                      >
                        Make Public
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700 flex items-center">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(endIndex, displayedLeads.length)}</span> of{" "}
                    <span className="font-medium">{displayedLeads.length}</span> leads
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                      const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                      if (showEllipsisBefore || showEllipsisAfter) {
                        return (
                          <span
                            key={page}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? "z-10 bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={editOpen}
        title="Edit Lead"
        onClose={() => setEditOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
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
              icon={UserIcon}
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
            <Select
              label="Country"
              value={editLead.country || ""}
              onChange={(e) =>
                setEditLead({ ...editLead, country: e.target.value })
              }
              options={[
                { value: "", label: "Select Country" },
                { value: "India", label: "India" },
                { value: "United States", label: "United States" },
                { value: "United Kingdom", label: "United Kingdom" },
                { value: "Canada", label: "Canada" },
                { value: "Australia", label: "Australia" },
                { value: "Germany", label: "Germany" },
                { value: "France", label: "France" },
                { value: "Japan", label: "Japan" },
                { value: "China", label: "China" },
                { value: "Brazil", label: "Brazil" },
                { value: "Mexico", label: "Mexico" },
                { value: "Singapore", label: "Singapore" },
                { value: "UAE", label: "UAE" },
                { value: "Saudi Arabia", label: "Saudi Arabia" },
                { value: "South Africa", label: "South Africa" },
                { value: "Other", label: "Other" }
              ]}
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
            <Textarea
              label="Admin Comment"
              value={editLead.adminComment || ""}
              onChange={(e) =>
                setEditLead({ ...editLead, adminComment: e.target.value })
              }
              placeholder="Add context for the sales team about this lead..."
              rows={3}
              helperText="This comment will be visible to the assigned sales person"
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

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        variant={confirmModal.variant}
      />
    </DashboardLayout>
  );
}
