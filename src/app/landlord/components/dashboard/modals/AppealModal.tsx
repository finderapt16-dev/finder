import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { Button } from "@/app/shared/components/ui/button";
import { AlertTriangle, MessageSquare, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface AppealModalProps {
  closeAppealModal: () => void;
  appealModal: { open: boolean; appealId: string | null; notificationId: string | null; apartmentId: string | null; apartmentTitle: string; reportId: string | null; violationId: string | null; relatedType: "report" | "violation" | "notice" | "admin_message"; relatedLabel: string; };
  isSubmittingAppeal: boolean;
  appealMessage: string;
  setAppealMessage: Dispatch<SetStateAction<string>>;
  appealContact: string;
  setAppealContact: Dispatch<SetStateAction<string>>;
  appealEvidence: EvidenceFile[];
  setAppealEvidence: Dispatch<SetStateAction<EvidenceFile[]>>;
  handleSubmitAppeal: () => Promise<void>;
}

export const AppealModal = ({
  closeAppealModal,
  appealModal,
  isSubmittingAppeal,
  appealMessage,
  setAppealMessage,
  appealContact,
  setAppealContact,
  appealEvidence,
  setAppealEvidence,
  handleSubmitAppeal,
}: AppealModalProps) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto" onClick={closeAppealModal}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#F3EFEA] overflow-hidden my-8"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F3EFEA] bg-[#FAF8F5]/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow bg-gradient-to-br from-[#8B735B] to-[#756A60]">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-black text-slate-900">Submit Appeal</p>
            <p className="text-xs text-slate-400 font-medium">{appealModal.relatedLabel}</p>
          </div>
        </div>
        <button onClick={closeAppealModal} disabled={isSubmittingAppeal} className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-50">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related apartment</p><p className="mt-1 text-sm font-bold text-slate-800">{appealModal.apartmentTitle}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-400">Related record</p><p className="mt-1 break-all text-xs font-bold text-slate-800">{appealModal.relatedLabel}</p></div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeal Message (required)</label>
            <span className="text-[10px] text-slate-400">{appealMessage.length}/500</span>
          </div>
          <textarea
            rows={4} maxLength={500}
            value={appealMessage}
            onChange={(e) => setAppealMessage(e.target.value)}
            placeholder="Explain your appeal and provide any supporting information…"
            className="w-full rounded-xl border-2 border-[#F3EFEA] bg-[#FAF8F5]/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A68B70] resize-none"
          />
        </div>

        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact information</label><input type="email" value={appealContact} onChange={(event) => setAppealContact(event.target.value)} placeholder="Email address" className="w-full rounded-xl border-2 border-[#F3EFEA] bg-[#FAF8F5]/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A68B70]" /></div>

        <div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Supporting evidence</p><EvidenceUploader evidenceFiles={appealEvidence} onEvidenceChange={setAppealEvidence} required={false} maxFiles={5} maxFileSize={10} /></div>

        <div className={`flex gap-3 p-3 rounded-xl border bg-[#FAF8F5] border-[#F3EFEA]`}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#756A60]" />
          <p className="text-xs font-medium text-[#5F5145]">
            Your appeal will be reviewed by an administrator. Please provide clear and detailed information.
          </p>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-[#FAF8F5] flex gap-3">
        <Button disabled={isSubmittingAppeal} onClick={handleSubmitAppeal}
          className="flex-1 font-bold rounded-xl shadow-md text-white bg-gradient-to-r from-[#8B735B] to-[#756A60] hover:from-[#756A60] hover:to-[#5F5145]">
          <MessageSquare className="h-4 w-4 mr-2 inline" />
          {isSubmittingAppeal ? "Submitting..." : "Submit Appeal"}
        </Button>
        <Button variant="outline" onClick={closeAppealModal} disabled={isSubmittingAppeal} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl">
          Cancel
        </Button>
      </div>
    </div>
  </div>
);
