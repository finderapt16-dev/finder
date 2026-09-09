import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { BookOpen, Building2, CheckCircle2, ChevronRight, HelpCircle, ListPlus, MessageSquare, Send, Settings, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";

interface HelpSectionProps {
  navigate: NavigateFunction;
  setSettingsTab: Dispatch<SetStateAction<string>>;
  supportSubmitted: boolean;
  setSupportSubmitted: Dispatch<SetStateAction<boolean>>;
  supportForm: { topic: string; message: string; contact: string; };
  setSupportForm: Dispatch<SetStateAction<{ topic: string; message: string; contact: string; }>>;
  handleSupportSubmit: () => Promise<void>;
  isSubmittingSupport: boolean;
}

export const HelpSection = ({
  navigate,
  setSettingsTab,
  supportSubmitted,
  setSupportSubmitted,
  supportForm,
  setSupportForm,
  handleSupportSubmit,
  isSubmittingSupport,
}: HelpSectionProps) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-5 pb-8">
    <header className="rounded-lg border border-[#E8DED1] bg-white px-5 py-7 shadow-sm sm:px-7">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B] shadow-sm"><HelpCircle className="h-6 w-6" /></span>
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#8B735B]">Help &amp; Support</p><h1 className="mt-1 text-2xl font-black text-[#302820] sm:text-3xl">Landlord Support Center</h1><p className="mt-1 text-sm font-medium text-[#756A60]">Get help managing listings, verification, and tenant inquiries.</p></div>
      </div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { icon: ListPlus, title: "Add a Property", desc: "Create a listing with photos, rent, rooms, and location.", action: () => navigate("/add-apartment"), tone: "bg-[#FAF8F5] text-[#8B735B]" },
        { icon: Building2, title: "Manage Listings", desc: "Review your posted properties and listing performance.", action: () => navigate("/dashboard?section=overview"), tone: "bg-[#FAF8F5] text-[#8B735B]" },
        { icon: Settings, title: "Business Settings", desc: "Update permit details, rental policies, and visibility.", action: () => { setSettingsTab("business"); navigate("/dashboard?section=settings"); }, tone: "bg-[#FAF8F5] text-[#8B735B]" },
      ].map(({ icon: Icon, title, desc, action, tone }) => (
        <button
          key={title}
          onClick={action}
          className="group flex min-h-28 items-center gap-4 rounded-lg border border-[#E8DED1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#DCC9B4] hover:bg-[#FAF8F5] hover:shadow-md"
        >
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm text-[#302820]">{title}</strong><span className="mt-1 block text-xs font-medium leading-5 text-[#756A60]">{desc}</span></span>
          <ChevronRight className="h-5 w-5 text-[#C9B8A5] transition group-hover:translate-x-0.5 group-hover:text-[#8B735B]" />
        </button>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
            <BookOpen className="h-5 w-5 text-[#8B735B]" />
            Listing Guide
          </CardTitle>
          <CardDescription>What landlords should put in each listing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Complete listing details", "Add rent, address, amenities, bedroom count, available date, and clear house rules."],
            ["Use real photos", "Upload accurate photos of the room, bathroom, kitchen, entrance, and shared areas."],
            ["Keep availability updated", "Mark units or rooms occupied as soon as they are no longer available."],
            ["Set clear policies", "Use Business settings for deposit, advance payment, lease term, pet, smoking, and maintenance terms."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-[#EEE6DC] bg-[#FAF8F5] p-4">
              <p className="font-black text-sm text-[#302820]">{title}</p>
              <p className="text-xs text-[#756A60] font-medium mt-0.5">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
            <ShieldCheck className="h-5 w-5 text-[#8B735B]" />
            Verification & Tenant Safety
          </CardTitle>
          <CardDescription>Keep listings trustworthy and easy to review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Permit verification", "Make sure your permit number and expiry date are current in Business settings."],
            ["Respond clearly", "Confirm rent inclusions, deposit requirements, viewing schedule, and move-in rules before visits."],
            ["Avoid misleading details", "Do not post outdated prices, unavailable rooms, or photos from a different unit."],
            ["Handle reports", "If a listing receives a report, review the details and update incorrect information quickly."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg border border-[#EEE6DC] bg-[#FAF8F5] p-4">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-black text-sm text-[#302820]">{title}</p>
                <p className="text-xs text-[#756A60] font-medium mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>

    <Card className="rounded-lg border-[#E8DED1] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#302820] font-black">
          <MessageSquare className="h-5 w-5 text-[#8B735B]" />
          Contact Support
        </CardTitle>
        <CardDescription>Your request uses the contact email associated with your landlord profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportSubmitted ? (
          <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-black text-[#302820]">Support request received</p>
            <p className="text-sm text-[#756A60] font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
            <Button
              onClick={() => setSupportSubmitted(false)}
              className="mt-4 rounded-xl bg-[#8B735B] text-white font-bold hover:bg-[#756A60]"
            >
              Send Another Request
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Topic</Label>
                <select
                  value={supportForm.topic}
                  onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                  className="w-full rounded-xl border border-[#E8DED1] bg-white px-3 py-2.5 text-sm font-semibold text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B]"
                >
                  <option value="">Choose a topic...</option>
                  <option value="Listing setup">Listing setup</option>
                  <option value="Verification">Verification</option>
                  <option value="Property visibility">Property visibility</option>
                  <option value="Tenant inquiry issue">Tenant inquiry issue</option>
                  <option value="Account or login">Account or login</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Contact Email</Label>
                <Input
                  value={supportForm.contact}
                  onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder="your@email.com"
                  className="rounded-xl border-[#E8DED1] bg-white focus-visible:ring-[#C9B8A5]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black text-[#756A60] uppercase tracking-widest">Message</Label>
                <span className="text-xs text-[#C9B8A5] font-medium">{supportForm.message.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={supportForm.message}
                onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Tell us what happened or what you need help with..."
                className="w-full rounded-xl border border-[#E8DED1] bg-white px-3 py-2.5 text-sm font-medium text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] resize-none"
              />
            </div>
            <Button
              onClick={() => void handleSupportSubmit()}
              disabled={isSubmittingSupport}
              className="w-full rounded-md bg-[#8B735B] text-white font-bold shadow-sm hover:bg-[#756A60]"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmittingSupport ? "Sending..." : "Send Support Request"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  </motion.div>
);
