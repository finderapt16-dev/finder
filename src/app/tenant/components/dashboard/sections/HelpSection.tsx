import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { AlertTriangle, BookOpen, CheckCircle, Heart, HelpCircle, MessageCircle, Search, Send, Shield } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import { HelpLineArt } from "@/app/tenant/components/dashboard/illustrations/HelpLineArt";

interface TenantSupportForm {
  topic: string;
  message: string;
  contact: string;
}

interface HelpSectionProps {
  navigate: NavigateFunction;
  setActiveSection: (section: string) => void;
  supportSubmitted: boolean;
  setSupportSubmitted: (submitted: boolean) => void;
  supportForm: TenantSupportForm;
  setSupportForm: Dispatch<SetStateAction<TenantSupportForm>>;
  handleSupportSubmit: () => Promise<void>;
  isSubmittingSupport: boolean;
}

export const HelpSection = ({
  navigate,
  setActiveSection,
  supportSubmitted,
  setSupportSubmitted,
  supportForm,
  setSupportForm,
  handleSupportSubmit,
  isSubmittingSupport,
}: HelpSectionProps) => (
  <div className="help-page mx-auto max-w-6xl space-y-6">
    <header className="help-hero relative flex min-h-[170px] items-center overflow-hidden rounded-2xl border border-[#e8ded1] bg-gradient-to-r from-[#faf8f5] to-[#fffdfb] p-6 md:px-8">
      <div className="relative z-10 max-w-[58%] max-md:max-w-full">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8ded1] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8b735b] shadow-sm">
          <HelpCircle className="h-4 w-4" />
          Guidance &amp; Support
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#302820] md:text-[34px]">Help</h1>
        <p className="mt-3 text-base font-medium text-[#756a60]">Find answers and guidance for using AptFindr.</p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-[43%] items-end text-[#b9a58f] md:flex"><HelpLineArt /></div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { icon: Search, title: "Browse apartments", desc: "Search, filter, and compare available places.", action: () => navigate("/browse") },
        { icon: Heart, title: "Review favorites", desc: "Return to apartments you saved earlier.", action: () => navigate("/favorites") },
        { icon: AlertTriangle, title: "Report a problem", desc: "Report inaccurate, suspicious, or unavailable listings.", action: () => setActiveSection("report") },
      ].map(({ icon: Icon, title, desc, action }) => (
        <button
          key={title}
          onClick={action}
          className="help-shortcut rounded-xl border border-[#e8ded1] bg-white p-5 text-left shadow-[0_2px_10px_rgba(48,40,32,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d7c9b8] hover:shadow-[0_7px_18px_rgba(48,40,32,0.08)]"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8ded1] bg-[#faf8f5]">
            <Icon className="h-5 w-5 text-[#8b735b]" />
          </div>
          <p className="font-black text-[#302820]">{title}</p>
          <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="help-guide-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
            <BookOpen className="h-5 w-5 text-[#8b735b]" />
            Tenant Guide
          </CardTitle>
          <CardDescription>Learn how to find and compare apartments in AptFindr.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Search and filters", "Use area, budget, bedrooms, parking, pet-friendly, and furnished filters to narrow listings."],
            ["Favorites", "Tap the heart on an apartment to save it for later comparison."],
            ["Listing details", "Check rent, room availability, amenities, location, photos, and verified listing status."],
            ["Report updates", "Open Notifications to check updates after an administrator reviews your report."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
              <p className="text-base font-bold text-[#302820]">{title}</p>
              <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="help-guide-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
            <Shield className="h-5 w-5 text-[#8b735b]" />
            Safety & Support
          </CardTitle>
          <CardDescription>Use listing information carefully and report details that appear inaccurate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Before visiting", "Confirm the exact location, rent inclusions, room availability, and viewing schedule."],
            ["Verified listings", "A verified badge means submitted listing documents were reviewed; it is not a guarantee of ownership or safety."],
            ["Report problems", "Use Report a Problem for inaccurate, suspicious, or unavailable listings."],
            ["Account help", "Use the form below for login, profile, favorites, or general app issues."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg border border-[#e8ded1] bg-[#faf8f5] p-4">
              <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-[#8b735b]" />
              <div>
                <p className="text-base font-bold text-[#302820]">{title}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-[#756a60]">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>

    <Card className="help-support-card rounded-xl border-[#e8ded1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-black text-[#302820]">
          <MessageCircle className="h-5 w-5 text-[#8b735b]" />
          Contact Support
        </CardTitle>
        <CardDescription>Submitted requests are securely sent to the support team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportSubmitted ? (
          <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-black text-slate-900">Support request received</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
            <Button
              onClick={() => setSupportSubmitted(false)}
              className="mt-4 rounded-lg bg-[#8b735b] font-bold text-white hover:bg-[#75614e]"
            >
              Send Another Request
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#302820]">Topic</Label>
                <select
                  value={supportForm.topic}
                  onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                  className="h-12 w-full rounded-xl border border-[#e8ded1] bg-white px-4 text-base font-semibold text-[#302820] focus:border-[#8b735b] focus:outline-none focus:ring-2 focus:ring-[#8b735b]/10"
                >
                  <option value="">Choose a topic...</option>
                  <option value="Account or login">Account or login</option>
                  <option value="Search and filters">Search and filters</option>
                  <option value="Favorites">Favorites</option>
                  <option value="Contacting landlord">Contacting landlord</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-[#302820]">Contact</Label>
                <Input
                  value={supportForm.contact}
                  onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder="Email or phone number"
                  className="h-12 rounded-xl border-[#e8ded1] bg-white text-base focus-visible:border-[#8b735b] focus-visible:ring-[#8b735b]/10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-[#302820]">Message</Label>
                <span className="text-xs text-slate-400 font-medium">{supportForm.message.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={supportForm.message}
                onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Tell us what happened or what you need help with..."
                className="w-full resize-none rounded-xl border border-[#e8ded1] bg-white px-4 py-3 text-base font-medium text-[#302820] focus:border-[#8b735b] focus:outline-none focus:ring-2 focus:ring-[#8b735b]/10"
              />
            </div>
            <Button
              onClick={() => void handleSupportSubmit()}
              disabled={isSubmittingSupport}
              className="h-12 w-full rounded-lg bg-[#8b735b] font-bold text-white shadow-sm hover:bg-[#75614e]"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmittingSupport ? "Sending..." : "Send Support Request"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  </div>
);
