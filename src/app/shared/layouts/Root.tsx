import { motion, useReducedMotion } from "motion/react";
import { useLocation, useOutlet } from "react-router-dom";
import { Toaster } from "../components/ui/sonner";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";
import { useAuth } from "../contexts/AuthContext";
import { pageTransition } from "../utils/motionPresets";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

function RootContent() {
  const location = useLocation();
  const outlet = useOutlet();
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState<{ status: string; title: string; message: string; expected_end_at?: string | null } | null>(null);
  useEffect(() => {
    if (!user) { setMaintenance(null); return; }
    const load = () => void supabase.from("platform_status").select("status,title,message,expected_end_at").eq("id", true).maybeSingle().then(({ data }) => setMaintenance(data));
    load();
    const channel = supabase.channel("platform-maintenance-gate").on("postgres_changes", { event: "*", schema: "public", table: "platform_status" }, load).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      {!prefersReducedMotion && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-orange-200/30 blur-3xl"
            animate={{ y: [0, 18, 0], x: [0, -10, 0], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-12 left-[12%] h-80 w-80 rounded-full bg-violet-200/25 blur-3xl"
            animate={{ y: [0, -16, 0], x: [0, 12, 0], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
      <motion.main
        key={`${location.pathname}${location.search}`}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        {maintenance?.status === "maintenance" && user?.role !== "super_admin" ? <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6"><section className="w-full max-w-xl rounded-2xl border border-[#E8DED1] bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EFEA] text-2xl">🛠</div><h1 className="mt-5 text-2xl font-black text-[#302820]">{maintenance.title || "AptFindr is temporarily under maintenance"}</h1><p className="mt-3 leading-7 text-[#756A60]">{maintenance.message || "We're performing system updates to improve platform reliability. Please try again later."}</p>{maintenance.expected_end_at && <p className="mt-4 text-sm font-bold text-[#8B735B]">Expected availability: {new Date(maintenance.expected_end_at).toLocaleString("en-PH")}</p>}</section></div> : outlet}
      </motion.main>
      <Toaster />
    </div>
  );
}

export function Root() {
  return (
    <ApartmentsProvider>
      <RootContent />
    </ApartmentsProvider>
  );
}
