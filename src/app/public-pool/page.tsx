"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/date";
import { ConfirmModal } from "@/components/ui";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonLeadCard } from "@/components/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

export default function PublicPoolPage() {
  const { user, loading } = useAuth(["sales", "team_leader"]);
  const { showToast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
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

  useEffect(() => {
    if (user) {
      setIsLoadingLeads(true);
      fetch("/api/leads/public")
        .then((r) => r.json())
        .then((d) => setLeads(d.leads || []))
        .finally(() => setIsLoadingLeads(false));
    }
  }, [user]);

  async function claimLead(leadId: string) {
    if (!user?.id) return;
    const lead = leads.find(l => l.id === leadId);
    setConfirmModal({
      open: true,
      title: "Claim Lead",
      message: `Are you sure you want to claim "${lead?.name || 'this lead'}"? This will assign it to you and remove it from the public pool.`,
      variant: 'info',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        setIsLoadingLeads(true);
        try {
          const response = await fetch(`/api/leads/${leadId}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id })
          });
          if (response.ok) {
            showToast("Lead claimed successfully!", "success");
          } else {
            showToast("Failed to claim lead", "error");
          }
          const d = await (await fetch("/api/leads/public")).json();
          setLeads(d.leads || []);
        } catch (error) {
          showToast("Failed to claim lead", "error");
        } finally {
          setIsLoadingLeads(false);
        }
      }
    });
  }

  if (loading) {
    return <LoadingScreen message="Loading public pool..." />;
  }

  if (!user) return null;

  return (
    <DashboardLayout userType={user.role === "team_leader" ? "team_leader" : "sales"}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Public Lead Pool</h2>
        {isLoadingLeads ? (
          <div className="grid gap-4">
            <SkeletonLeadCard />
            <SkeletonLeadCard />
            <SkeletonLeadCard />
            <SkeletonLeadCard />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No leads in the public pool
          </div>
        ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <div key={lead.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">{lead.name}</h3>
                  <p className="text-sm text-gray-500">{lead.email}</p>
                </div>
                <button
                  onClick={() => claimLead(lead.id)}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors min-h-[44px]"
                >
                  Claim Lead
                </button>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <div>Phone: {lead.phone}</div>
                <div>
                  Added: {formatDate(lead.createdAt)}
                  {(lead as any).country && ` • ${(lead as any).country}`}
                </div>
                <div>Added by: {(lead as any).createdByUser?.name || "System"}</div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={lead.status || "NEW"} />
                  <PriorityBadge priority={lead.priority || "MEDIUM"} />
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

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
