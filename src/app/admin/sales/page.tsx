"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { User } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/date";
import Button from "@/components/Button";
import LoadingScreen from "@/components/LoadingScreen";
import { SkeletonUserCard } from "@/components/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import { useLoading } from "@/components/LoadingOverlay";
import Link from "next/link";

export default function SalesTeamPage() {
  const { user, loading } = useAuth("admin");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [unassignedMembers, setUnassignedMembers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", role: "sales" });
  const { showToast } = useToast();
  const { withLoading } = useLoading();
  const [activeTab, setActiveTab] = useState<"members" | "teams">("members");

  // For modal editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  // For delete confirmation modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);

  // For promote/demote confirmation modal
  const [roleChangeModal, setRoleChangeModal] = useState<{
    open: boolean; user: User | null; action: "promote" | "demote";
  }>({ open: false, user: null, action: "promote" });

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchTeams();
    }
  }, [user]);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    // Show sales + team leader users (exclude admins)
    setAllUsers(data.users?.filter((u: User) => u.role === "sales" || u.role === "team_leader") || []);
  }

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeamLeaders(data.teamLeaders || []);
      setUnassignedMembers(data.unassignedMembers || []);
    } catch (e) {
      console.error("Error fetching teams:", e);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await withLoading(
        fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        "Adding team member..."
      );
      setForm({ name: "", email: "", username: "", password: "", role: "sales" });
      fetchUsers();
      fetchTeams();
      showToast("Team member added successfully");
    } catch (error) {
      showToast("Failed to add team member", "error");
    }
  }

  async function promoteToLeader(userId: string) {
    try {
      await withLoading(
        fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "team_leader" }),
        }),
        "Promoting to team leader..."
      );
      fetchUsers();
      fetchTeams();
      showToast("Promoted to Team Leader");
    } catch {
      showToast("Failed to promote user", "error");
    }
  }

  async function demoteToSales(userId: string) {
    try {
      await withLoading(
        fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "sales" }),
        }),
        "Demoting to sales member..."
      );
      fetchUsers();
      fetchTeams();
      showToast("Demoted to Sales Member");
    } catch {
      showToast("Failed to demote user", "error");
    }
  }

  async function assignMemberToLeader(memberId: string, teamLeaderId: string | null) {
    try {
      await withLoading(
        fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, teamLeaderId }),
        }),
        "Assigning team member..."
      );
      fetchTeams();
      showToast("Team member assigned successfully");
    } catch {
      showToast("Failed to assign team member", "error");
    }
  }

  async function updateMember() {
    if (!selectedMember) return;

    try {
      const updateData: any = {
        name: editForm.name,
        username: editForm.username,
        email: editForm.email,
      };
      
      // Only include password if it's not empty
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      await withLoading(
        fetch(`/api/users/${selectedMember.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }),
        "Updating member..."
      );
      fetchUsers();
      fetchTeams();
      showToast("Member updated successfully");
      setIsModalOpen(false);
    } catch {
      showToast("Failed to update member", "error");
    }
  }

  async function deleteMember() {
    if (!memberToDelete) return;
    try {
      const res = await withLoading(
        fetch(`/api/users/${memberToDelete.id}`, { method: "DELETE", credentials: 'include' }),
        "Removing team member..."
      );
      if (!res.ok) {
        let message = 'Failed to remove team member';
        try { const data = await res.json(); if (data?.error) message = data.error; } catch {}
        showToast(message, "error");
        return;
      }
      setIsDeleteOpen(false);
      setMemberToDelete(null);
      fetchUsers();
      fetchTeams();
      showToast("Team member removed successfully");
    } catch {
      showToast("Failed to remove team member", "error");
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading sales team..." />;
  }

  if (!user) return null;

  const salesUsers = allUsers.filter((u) => u.role === "sales");
  const tlUsers = allUsers.filter((u) => u.role === "team_leader");

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h1 className="text-2xl font-semibold">Sales Team</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "members"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All Members ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "teams"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Teams ({teamLeaders.length})
          </button>
        </div>

        {activeTab === "members" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Team List */}
            <div className="lg:col-span-2">
              {/* Team Leaders Section */}
              {tlUsers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Team Leaders ({tlUsers.length})
                  </h2>
                  <div className="space-y-4">
                    {tlUsers.map((member) => (
                      <div key={member.id} className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/users/${member.id}`}
                                className="font-medium text-purple-700 hover:text-purple-900 hover:underline"
                              >
                                {member.name}
                              </Link>
                              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-medium rounded-full">
                                Team Leader
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{member.email}</p>
                            {member.username && (
                              <p className="text-sm text-gray-500">@{member.username}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setEditForm({
                                  name: member.name,
                                  username: member.username || "",
                                  email: member.email,
                                  password: "",
                                });
                                setIsModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-amber-600 hover:text-amber-800"
                              onClick={() => setRoleChangeModal({ open: true, user: member, action: "demote" })}
                            >
                              Demote
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => {
                                setMemberToDelete(member);
                                setIsDeleteOpen(true);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales Members Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  Sales Members ({salesUsers.length})
                </h2>
                <div className="space-y-4">
                  {salesUsers.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div>
                          <Link
                            href={`/admin/users/${member.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {member.name}
                          </Link>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          {member.username && (
                            <p className="text-sm text-gray-500">@{member.username}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                          <div className="text-sm text-gray-500">
                            Joined {formatDate(member.createdAt)}
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setEditForm({
                                name: member.name,
                                username: member.username || "",
                                email: member.email,
                                password: "",
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-purple-600 hover:text-purple-800"
                            onClick={() => setRoleChangeModal({ open: true, user: member, action: "promote" })}
                          >
                            Promote
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => {
                              setMemberToDelete(member);
                              setIsDeleteOpen(true);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {salesUsers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No sales members yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Add Team Member Form */}
            <div>
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Add Team Member</h2>
                <form onSubmit={createUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                      type="text"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="sales">Sales Member</option>
                      <option value="team_leader">Team Leader</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full">
                    Add Member
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* Team Leaders & Their Teams */}
            {teamLeaders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Leaders Yet</h3>
                <p className="text-gray-500">Promote a sales member to Team Leader from the Members tab.</p>
              </div>
            ) : (
              teamLeaders.map((leader: any) => (
                <div key={leader.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-700 font-bold">
                          {leader.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{leader.name}</h2>
                        <p className="text-sm text-gray-500">{leader.email}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        Team Leader
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 sm:mt-0">
                      {leader.teamMembers?.length || 0} member(s)
                    </p>
                  </div>

                  {/* Team Members */}
                  <div className="border rounded-lg divide-y">
                    {leader.teamMembers?.length > 0 ? (
                      leader.teamMembers.map((member: any) => (
                        <div key={member.id} className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => assignMemberToLeader(member.id, null)}
                          >
                            Unassign
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-gray-500 text-sm text-center">No members assigned</p>
                    )}
                  </div>

                  {/* Assign dropdown */}
                  {unassignedMembers.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignMemberToLeader(e.target.value, leader.id);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="" disabled>+ Assign a member...</option>
                        {unassignedMembers.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Unassigned Members */}
            {unassignedMembers.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="font-semibold text-amber-800 mb-3">
                  Unassigned Sales Members ({unassignedMembers.length})
                </h3>
                <div className="space-y-2">
                  {unassignedMembers.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center bg-white rounded-lg p-3">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      {teamLeaders.length > 0 && (
                        <select
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              assignMemberToLeader(member.id, e.target.value);
                            }
                          }}
                        >
                          <option value="" disabled>Assign to...</option>
                          {teamLeaders.map((tl: any) => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && selectedMember && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep the current password
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={updateMember}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && memberToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Remove Team Member</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove
              {" "}
              <span className="font-medium">{memberToDelete.name}</span>
              {" "}from the sales team? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setIsDeleteOpen(false); setMemberToDelete(null); }}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={deleteMember}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Promote/Demote Confirmation Modal */}
      {roleChangeModal.open && roleChangeModal.user && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">
              {roleChangeModal.action === "promote" ? "Promote to Team Leader" : "Demote to Sales Member"}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to {roleChangeModal.action}{" "}
              <span className="font-medium">{roleChangeModal.user.name}</span>
              {roleChangeModal.action === "promote"
                ? " to Team Leader? They will be able to manage a team of sales members."
                : " to Sales Member? They will lose their team leader privileges and any team assignments."}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setRoleChangeModal({ open: false, user: null, action: "promote" })}
              >
                Cancel
              </Button>
              <Button
                className={roleChangeModal.action === "promote" ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-600 hover:bg-amber-700"}
                onClick={async () => {
                  const userId = roleChangeModal.user!.id;
                  setRoleChangeModal({ open: false, user: null, action: "promote" });
                  if (roleChangeModal.action === "promote") {
                    await promoteToLeader(userId);
                  } else {
                    await demoteToSales(userId);
                  }
                }}
              >
                {roleChangeModal.action === "promote" ? "Promote" : "Demote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
