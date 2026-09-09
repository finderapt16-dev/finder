import { EvidenceUploader, type EvidenceFile } from "@/app/shared/components/common/EvidenceUploader";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent } from "@/app/shared/components/ui/card";
import { AlertTriangle, Building2, CheckCircle, Image as ImageIcon, LockKeyhole, Mail, MessageCircle, RotateCcw, Send, Shield } from "lucide-react";
import type { Apartment } from "@/app/shared/data/apartments";
import type { User } from "@/app/shared/services/authService";
import type { Dispatch, SetStateAction } from "react";
import { ReportLineArt } from "@/app/tenant/components/dashboard/illustrations/ReportLineArt";
import { ReportStep } from "@/app/tenant/components/dashboard/ReportStep";

interface TenantReportForm {
  apartment: string;
  details: string;
  contact: string;
}

interface ReportSectionProps {
  reportSubmitted: boolean;
  resetReport: () => void;
  reportForm: TenantReportForm;
  setReportForm: Dispatch<SetStateAction<TenantReportForm>>;
  publishedApartments: Apartment[];
  reportEvidenceFiles: EvidenceFile[];
  setReportEvidenceFiles: Dispatch<SetStateAction<EvidenceFile[]>>;
  user: User | null;
  handleReportSubmit: () => Promise<void>;
  isSubmittingReport: boolean;
}

export const ReportSection = ({
  reportSubmitted,
  resetReport,
  reportForm,
  setReportForm,
  publishedApartments,
  reportEvidenceFiles,
  setReportEvidenceFiles,
  user,
  handleReportSubmit,
  isSubmittingReport,
}: ReportSectionProps) => (
  <div className="report-page mx-auto max-w-6xl space-y-6">
    <header className="report-hero relative flex min-h-[170px] items-center overflow-hidden rounded-2xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
      <div className="relative z-10 max-w-[58%] max-md:max-w-full">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          Support &amp; Safety
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Report a Problem</h2>
        <p className="mt-3 text-base font-medium text-[#756a60]">Tell us about inaccurate or problematic apartment listing information.</p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><ReportLineArt /></div>
    </header>

    {reportSubmitted ? (
      <Card className="report-success rounded-xl border border-emerald-100 bg-white shadow-[0_4px_18px_rgba(48,40,32,0.06)]">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-[#302820]">Report Submitted</h3>
          <p className="max-w-md text-sm font-medium leading-6 text-[#756a60]">
            Thank you for helping us keep listings accurate. You will receive a notification after an administrator completes the review.
          </p>
          <Button onClick={resetReport} className="mt-2 rounded-lg bg-[#8b735b] px-6 font-black text-white hover:bg-[#75614e]">
            Submit Another Report
          </Button>
        </CardContent>
      </Card>
    ) : (
      <Card className="report-form overflow-hidden rounded-xl border border-[#e8ded1] bg-white shadow-[0_4px_18px_rgba(48,40,32,0.06)]">
        <CardContent className="p-0">
          <ReportStep icon={Building2} step="1" title="Select Apartment" description="Choose the apartment listing related to your report." tone="bg-[#f3efea] text-[#8b735b]">
            <select value={reportForm.apartment} onChange={(e) => setReportForm((f) => ({ ...f, apartment: e.target.value }))} className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white px-4 text-base font-semibold text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10">
              <option value="">Select an apartment...</option>
              {publishedApartments.map((apt) => <option key={apt.id} value={apt.id}>{apt.title}</option>)}
            </select>
          </ReportStep>

          <ReportStep icon={MessageCircle} step="2" title="Describe the Problem" description="Please provide as much detail as possible." tone="bg-[#f3efea] text-[#8b735b]">
            <div className="relative">
              <textarea rows={5} maxLength={500} value={reportForm.details} onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))} placeholder="Describe what you experienced in as much detail as possible..." className="min-h-40 w-full resize-none rounded-xl border border-[#e8ded1] bg-white px-4 py-4 text-base font-medium text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10" />
              <span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">{reportForm.details.length}/500</span>
            </div>
          </ReportStep>

          <ReportStep icon={ImageIcon} step="3" title="Upload Image / Evidence" description="Attach at least one image or document for admin review." note="Required" tone="bg-[#f3efea] text-[#8b735b]">
            <EvidenceUploader evidenceFiles={reportEvidenceFiles} onEvidenceChange={setReportEvidenceFiles} maxFiles={5} maxFileSize={10} required />
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#8b735b]" />
              <div>
                <p className="text-sm font-black text-[#302820]">Evidence helps us review your report faster.</p>
                <p className="mt-1 text-xs font-medium text-[#756a60]">Clear screenshots, photos, or documents are very helpful.</p>
              </div>
            </div>
          </ReportStep>

          <ReportStep icon={Mail} step="4" title="Contact Information" description="We may contact you for more details if needed." tone="bg-[#f3efea] text-[#8b735b]">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="text" value={reportForm.contact} onChange={(e) => setReportForm((f) => ({ ...f, contact: e.target.value }))} placeholder={user?.email || "Enter your email address"} className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white pl-12 pr-4 text-base font-semibold text-[#302820] outline-none transition focus:border-[#8b735b] focus:ring-2 focus:ring-[#8b735b]/10" />
            </div>
          </ReportStep>

          <div className="grid gap-4 border-t border-[#e8ded1] bg-[#faf8f5] p-5 lg:grid-cols-[220px_1fr_260px] lg:items-center">
            <Button variant="outline" onClick={resetReport} className="h-12 rounded-lg border-[#e8ded1] bg-white font-black text-[#756a60] hover:bg-[#f3efea] hover:text-[#8b735b]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear Form
            </Button>
            <div className="flex items-center justify-center gap-3 text-center text-sm font-medium text-[#756a60]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8b735b] shadow-sm"><LockKeyhole className="h-4 w-4" /></span>
              <span><strong className="font-black text-[#302820]">Your information is secure.</strong> We only use this information for this report.</span>
            </div>
            <Button onClick={() => void handleReportSubmit()} disabled={isSubmittingReport || !reportForm.apartment || !reportForm.details.trim() || reportEvidenceFiles.length === 0} className="h-12 rounded-lg bg-[#8b735b] font-black text-white shadow-sm hover:bg-[#75614e] disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="mr-2 h-4 w-4" />
              {isSubmittingReport ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);
