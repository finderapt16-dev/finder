import { Button } from "@/app/shared/components/ui/button";
import type { DashboardUserRow } from "@/app/shared/services/dashboardSupabaseService";
import { fetchPlatformUsers, setUserAccountActive } from "@/app/super-admin/services/superAdminService";
import { Search, UserRoundSearch, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RoleFilter = "all" | "admin" | "landlord" | "tenant";

export function UserManagement() {
  const [users, setUsers] = useState<DashboardUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState("all");
  const load = async () => {
    setLoading(true);
    try { setUsers(await fetchPlatformUsers()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load users."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => users.filter((user) => {
    const userRole = String(user.role ?? "tenant").toLowerCase();
    const normalizedRole = userRole === "super_admin" ? "admin" : userRole;
    const userStatus = String(user.status ?? "active").toLowerCase();
    const needle = search.trim().toLowerCase();
    return (role === "all" || normalizedRole === role)
      && (status === "all" || userStatus === status)
      && (!needle || `${String(user.name ?? "")} ${String(user.email ?? "")}`.toLowerCase().includes(needle));
  }), [users, search, role, status]);
  const toggle = async (user: DashboardUserRow) => {
    const activate = String(user.status ?? "active").toLowerCase() === "disabled";
    try { await setUserAccountActive(String(user.id), activate); toast.success(activate ? "Account reactivated." : "Account deactivated."); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update account."); }
  };
  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="border-b border-[#E8DED1] pb-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#8B735B]">Super Admin</p><h1 className="mt-1 text-2xl font-black text-[#302820]">User Management</h1><p className="mt-1 text-sm text-[#756A60]">Monitor Admin, Landlord, and Tenant accounts across AptFindr.</p></header>
    <section className="flex flex-col gap-3 rounded-xl border border-[#E8DED1] bg-white p-4 lg:flex-row">
      <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8179]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="h-11 w-full rounded-lg border border-[#E8DED1] pl-10 pr-3 text-sm outline-none focus:border-[#8B735B]" /></label>
      <select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)} className="h-11 rounded-lg border border-[#E8DED1] bg-white px-3 text-sm"><option value="all">All roles</option><option value="admin">Admins</option><option value="landlord">Landlords</option><option value="tenant">Tenants</option></select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-[#E8DED1] bg-white px-3 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="pending">Pending</option></select>
    </section>
    <section className="overflow-hidden rounded-xl border border-[#E8DED1] bg-white">{loading ? <div className="p-10 text-center text-sm text-[#756A60]">Loading users...</div> : visible.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><UserRoundSearch className="h-10 w-10 text-[#C9B8A5]" /><h2 className="mt-3 font-black text-[#302820]">No users found</h2><p className="mt-1 text-sm text-[#756A60]">No account matches the current search and filters.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-[#FAF8F5] text-xs uppercase tracking-wide text-[#756A60]"><tr><th className="p-4">User</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Date Joined</th><th className="p-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#EEE6DC]">{visible.map((account) => { const disabled = String(account.status ?? "active").toLowerCase() === "disabled"; const protectedAccount = String(account.role) === "super_admin"; return <tr key={String(account.id)}><td className="p-4"><strong className="block text-[#302820]">{String(account.name ?? "Unnamed user")}</strong><span className="text-xs text-[#756A60]">{String(account.email ?? "")}</span></td><td className="p-4 capitalize text-[#302820]">{String(account.role ?? "tenant").replace("_", " ")}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{disabled ? "Disabled" : String(account.status ?? "Active")}</span></td><td className="p-4 text-[#756A60]">{account.created_at ? new Date(String(account.created_at)).toLocaleDateString("en-PH") : "—"}</td><td className="p-4 text-right"><Button variant="outline" disabled={protectedAccount} onClick={() => void toggle(account)} className={disabled ? "text-emerald-700" : "text-rose-700"}>{disabled ? "Reactivate" : <><XCircle className="mr-2 h-4 w-4" />Deactivate</>}</Button></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
