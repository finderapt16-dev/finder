import { Button } from "@/app/shared/components/ui/button";
import { SettingsToggle as Toggle } from "@/app/landlord/components/settings/SettingsToggle";
import { SettingsField as Field } from "@/app/landlord/components/settings/SettingsField";
import { SettingsInput } from "@/app/landlord/components/settings/SettingsInput";
import { SettingsSelect } from "@/app/landlord/components/settings/SettingsSelect";
import { SettingsSectionTitle as SectionTitle } from "@/app/landlord/components/settings/SettingsSectionTitle";
import { AlertRow } from "@/app/landlord/components/settings/AlertRow";
import type { LandlordAlerts } from "@/app/landlord/types/settings";

interface AlertsTabProps {
  alerts: LandlordAlerts;
  setA: (key: string, val: unknown) => void;
  handleSaveAlerts: () => Promise<void>;
}

export const AlertsTab = ({
  alerts,
  setA,
  handleSaveAlerts,
}: AlertsTabProps) => (
  <div className="space-y-5">
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
      <SectionTitle icon="🏠" title="Tenant Activity" subtitle="In-app reminders when tenants interact with your listings" />
      <AlertRow label="Listing Added to Favorites" hint="A tenant saves your apartment to their Favorites." pushVal={alerts.reviewPush} onPush={(v) => setA("reviewPush", v)} />
      <AlertRow label="Listing Appears in Suggested or Popular" hint="Your unit is being surfaced to tenants in their dashboard" pushVal={alerts.listingPush} onPush={(v) => setA("listingPush", v)} />
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
      <SectionTitle icon="⚠️" title="Admin & Compliance" subtitle="Reports, violations, and notices from platform administrators" />
      <AlertRow label="Report Filed Against Listing" hint="A tenant submits a report about your unit" pushVal={alerts.reportPush} onPush={(v) => setA("reportPush", v)} />
      <AlertRow label="Violation / Notice Issued" hint="Admin issues a formal violation or notice" pushVal={alerts.violationPush} onPush={(v) => setA("violationPush", v)} />
      <AlertRow label="Permit Verification Reminder" hint="30-day reminder before your business permit expires" pushVal={alerts.permitPush} onPush={(v) => setA("permitPush", v)} />
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
      <SectionTitle icon="🛠️" title="System & Platform" subtitle="Account changes and platform announcements" />
      <AlertRow label="Platform Announcements" hint="New features, policy updates, maintenance" pushVal={alerts.systemPush} onPush={(v) => setA("systemPush", v)} />
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="🕐" title="Delivery Preferences" subtitle="Digest schedule and quiet hours" />
      <Field label="Activity Digest" hint="Receive a summary instead of individual notifications">
        <SettingsSelect value={alerts.digest} onChange={(e: any) => setA("digest", e.target.value)}>
          <option value="realtime">Real-time (no digest)</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </SettingsSelect>
      </Field>
      <div className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#E8DED1] rounded-xl">
        <div>
          <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
          <p className="text-xs text-slate-500 font-medium">Pause push notifications during rest hours</p>
        </div>
        <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
      </div>
      {alerts.quietEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quiet From">
            <SettingsInput type="time" value={alerts.quietStart} onChange={(e: any) => setA("quietStart", e.target.value)} />
          </Field>
          <Field label="Quiet Until">
            <SettingsInput type="time" value={alerts.quietEnd} onChange={(e: any) => setA("quietEnd", e.target.value)} />
          </Field>
        </div>
      )}
    </div>

    <Button onClick={handleSaveAlerts} className="w-full bg-[#8B735B] hover:bg-[#756A60] text-white rounded-xl font-bold shadow-md shadow-[#E8DED1]">
      Save Alert Preferences
    </Button>
  </div>
);
