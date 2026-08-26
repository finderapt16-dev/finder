import { Button } from "@/app/shared/components/ui/button";
import type { DashboardUserRow } from "@/app/shared/services/dashboardSupabaseService";
import { createAdminAccount, fetchAdminAccounts, setAdminAccountActive, updateAdminAccount } from "@/app/super-admin/services/superAdminService";
import { CheckCircle2, Plus, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = { name: string; email: string; department: string; adminLevel: string; password: string };
const EMPTY_FORM: FormState = { name: "", email: "", department: "Platform Administration", adminLevel: "Administrator", password: "" };

export function AdminManagement() {
  const [admins, setAdmins] = useState<DashboardUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<DashboardUserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try { setAdmins(await fetchAdminAccounts()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load Admin accounts."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (admin: DashboardUserRow) => {
    setEditing(admin);
    setForm({ name: String(admin.name ?? ""), email: String(admin.email ?? ""), department: String(admin.department ?? ""), adminLevel: String(admin.admin_level ?? admin.adminLevel ?? "Administrator"), password: "" });
    setShowForm(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || (!editing && form.password.length < 12)) {
      toast.error(editing ? "Name and email are required." : "Name, email, and a password of at least 12 characters are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) await updateAdminAccount(String(editing.id), form);
      else await createAdminAccount(form);
      toast.success(editing ? "Admin account updated." : "Admin account created.");
      setShowForm(false); setEditing(null); setForm(EMPTY_FORM); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save the Admin account."); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (admin: DashboardUserRow) => {
    const active = String(admin.status ?? "active").toLowerCase() === "disabled";
    try { await setAdminAccountActive(String(admin.id), active); toast.success(active ? "Admin activated." : "Admin deactivated."); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update account status."); }
  };

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8DED1] pb-5"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#8B735B]">Super Admin</p><h1 className="mt-1 text-2xl font-black text-[#302820]">Admin Management</h1><p className="mt-1 text-sm text-[#756A60]">Create and manage regular AptFindr Administrator accounts.</p></div><Button onClick={openCreate} className="bg-[#8B735B] text-white hover:bg-[#756A60]"><Plus className="mr-2 h-4 w-4" />Create Admin</Button></header>
    {showForm && <form onSubmit={save} className="grid gap-4 rounded-xl border border-[#E8DED1] bg-white p-5 md:grid-cols-2"><h2 className="md:col-span-2 text-lg font-black text-[#302820]">{editing ? "Edit Administrator" : "Create Administrator"}</h2>{(["name", "email", "department", "adminLevel"] as const).map((field) => <label key={field} className="space-y-1 text-xs font-bold capitalize text-[#756A60]">{field === "adminLevel" ? "Admin level" : field}<input type={field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))} className="h-11 w-full rounded-lg border border-[#E8DED1] px-3 text-sm text-[#302820] outline-none focus:border-[#8B735B]" required={field === "name" || field === "email"} /></label>)}{!editing && <label className="space-y-1 text-xs font-bold text-[#756A60] md:col-span-2">Initial password<input type="password" minLength={12} value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} className="h-11 w-full rounded-lg border border-[#E8DED1] px-3 text-sm text-[#302820] outline-none focus:border-[#8B735B]" required autoComplete="new-password" /><span className="block font-medium text-[#8A8179]">The password is sent only to the protected server function and is never displayed or stored by this portal.</span></label>}<div className="flex gap-3 md:col-span-2"><Button type="submit" disabled={saving} className="bg-[#8B735B] text-white hover:bg-[#756A60]">{saving ? "Saving..." : "Save Admin"}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div></form>}
    <section className="overflow-hidden rounded-xl border border-[#E8DED1] bg-white">{loading ? <div className="p-10 text-center text-sm text-[#756A60]">Loading Admin accounts...</div> : admins.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><ShieldCheck className="h-10 w-10 text-[#C9B8A5]" /><h2 className="mt-3 font-black text-[#302820]">No Admin accounts found</h2><p className="mt-1 text-sm text-[#756A60]">Create the first regular Administrator account.</p></div> : <div className="divide-y divide-[#EEE6DC]">{admins.map((admin) => { const disabled = String(admin.status ?? "active").toLowerCase() === "disabled"; return <article key={String(admin.id)} className="flex flex-wrap items-center gap-4 p-4 sm:p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F3EFEA] text-[#8B735B]"><UserCog className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="font-black text-[#302820]">{String(admin.name ?? "Administrator")}</h3><p className="truncate text-sm text-[#756A60]">{String(admin.email ?? "")}</p><p className="mt-1 text-xs text-[#8A8179]">{String(admin.department ?? "No department")} · {String(admin.admin_level ?? admin.adminLevel ?? "Administrator")}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${disabled ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{disabled ? "Inactive" : "Active"}</span><Button variant="outline" onClick={() => openEdit(admin)}>View / Edit</Button><Button variant="outline" onClick={() => void toggleStatus(admin)} className={disabled ? "text-emerald-700" : "text-rose-700"}>{disabled ? "Activate" : "Deactivate"}</Button></article>; })}</div>}</section>
  </div>;
}
