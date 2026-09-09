import { Button } from "@/app/shared/components/ui/button";
import { type Apartment } from "@/app/shared/data/apartments";
import { type DashboardAppealRow, type DashboardNotificationRow, type DashboardViolationRow } from "@/app/shared/services/dashboardSupabaseService";
import { MessageSquare, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface NotificationDetailModalProps {
  selectedNotificationDetail: { notification: DashboardNotificationRow; violation: DashboardViolationRow | null; appeal: DashboardAppealRow | null; };
  getAppealMetadata: (appeal: DashboardAppealRow, kind: string) => Record<string, unknown> | undefined;
  myApartments: Apartment[];
  landlordAppeals: DashboardAppealRow[];
  setSelectedNotificationDetail: Dispatch<SetStateAction<{ notification: DashboardNotificationRow; violation: DashboardViolationRow | null; appeal: DashboardAppealRow | null; } | null>>;
  openAppealForNotification: (detail: NonNullable<{ notification: DashboardNotificationRow; violation: DashboardViolationRow | null; appeal: DashboardAppealRow | null; } | null>) => void;
}

export const NotificationDetailModal = ({
  selectedNotificationDetail,
  getAppealMetadata,
  myApartments,
  landlordAppeals,
  setSelectedNotificationDetail,
  openAppealForNotification,
}: NotificationDetailModalProps) => {
  const { notification, violation, appeal } = selectedNotificationDetail;
  const payload = notification.payload ?? {};
  const appealSource = appeal ? getAppealMetadata(appeal, "source") : undefined;
  const apartmentId = String(payload.apartment_id ?? violation?.apartment_id ?? appealSource?.apartment_id ?? "");
  const apartment = myApartments.find((item) => item.id === apartmentId);
  const apartmentTitle = String(payload.apartment_title ?? appealSource?.apartment_title ?? apartment?.title ?? "Apartment unavailable");
  const reportId = String(payload.report_id ?? payload.related_report_id ?? violation?.related_report_id ?? appeal?.report_id ?? "");
  const violationId = String(payload.violation_id ?? violation?.id ?? appeal?.violation_id ?? "");
  const existingAppeal = landlordAppeals.find((item) => {
    const source = getAppealMetadata(item, "source");
    return (reportId && item.report_id === reportId)
      || (violationId && item.violation_id === violationId)
      || (!reportId && !violationId && source?.notification_id === notification.id);
  });
  const canAppeal = notification.type !== "appeal_status_updated";
  const appealForAction = appeal ?? existingAppeal;
  const needsInformation = appealForAction?.status === "needs_information";
  return (
    <div className="fixed inset-0 z-[108] flex items-center justify-center overflow-y-auto p-4" onClick={() => setSelectedNotificationDetail(null)}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" className="relative z-10 my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#F3EFEA] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#F3EFEA] bg-[#FAF8F5]/50 px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#756A60]">Administrative notification</p><h2 className="mt-1 text-xl font-black text-slate-950">{notification.title || "Admin message"}</h2></div><button onClick={() => setSelectedNotificationDetail(null)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Apartment</p><p className="mt-1 text-sm font-bold text-slate-800">{apartmentTitle}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Date received</p><p className="mt-1 text-sm font-bold text-slate-800">{new Date(notification.created_at ?? notification.createdAt ?? Date.now()).toLocaleString("en-PH")}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related record</p><p className="mt-1 break-all text-sm font-bold text-slate-800">{violationId ? `${violation?.mode === "notice" ? "Notice" : "Violation"}: ${violationId}` : reportId ? `Report: ${reportId}` : `Message: ${notification.id ?? "Unavailable"}`}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Status</p><p className="mt-1 text-sm font-bold capitalize text-slate-800">{String(appeal?.status ?? existingAppeal?.status ?? payload.status ?? "open").replace(/_/g, " ")}</p></div>
          </div>
          <div><p className="text-[10px] font-black uppercase text-slate-400">Admin message</p><p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 p-4 text-sm font-medium leading-6 text-slate-700">{String(appeal?.admin_response ?? payload.admin_response ?? notification.message ?? "No message provided.")}</p></div>
          {(appeal || existingAppeal) && <div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-black text-blue-800">Appeal status: {String((appeal || existingAppeal)?.status ?? "pending").replace(/_/g, " ")}</p>{(appeal || existingAppeal)?.admin_response && <p className="mt-2 text-xs font-medium text-blue-700">{(appeal || existingAppeal)?.admin_response}</p>}</div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setSelectedNotificationDetail(null)} className="font-bold">Close</Button>{(canAppeal || needsInformation) && <Button disabled={Boolean(existingAppeal) && !needsInformation} onClick={() => openAppealForNotification({ ...selectedNotificationDetail, appeal: appealForAction ?? null })} className="bg-[#8B735B] font-bold text-white hover:bg-[#756A60]"><MessageSquare className="mr-2 h-4 w-4" />{needsInformation ? "Provide Information" : existingAppeal ? "Appeal Submitted" : "Submit Appeal"}</Button>}</div>
      </div>
    </div>
  );
};
