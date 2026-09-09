import { Button } from "@/app/shared/components/ui/button";
import { toast } from "sonner";
import type { Dispatch, SetStateAction } from "react";
import { SettingsToggle as Toggle } from "@/app/landlord/components/settings/SettingsToggle";
import { SettingsField as Field } from "@/app/landlord/components/settings/SettingsField";
import { SettingsInput } from "@/app/landlord/components/settings/SettingsInput";
import { SettingsSelect } from "@/app/landlord/components/settings/SettingsSelect";
import { SettingsSectionTitle as SectionTitle } from "@/app/landlord/components/settings/SettingsSectionTitle";
import type { LandlordSecurity } from "@/app/landlord/types/settings";

interface SecurityTabProps {
  security: LandlordSecurity;
  passwordState: { current: string; new: string; confirm: string; showCurrent: boolean; showNew: boolean; showConfirm: boolean; isChanging: boolean; };
  setPasswordState: Dispatch<SetStateAction<{ current: string; new: string; confirm: string; showCurrent: boolean; showNew: boolean; showConfirm: boolean; isChanging: boolean; }>>;
  handlePasswordChange: () => Promise<void>;
  twoFAState: { setupMode: boolean; factorId: string; secret: string; verificationCode: string; confirmed: boolean; isVerifying: boolean; };
  handleSetup2FA: () => Promise<void>;
  updateSecurity: (updater: (prev: LandlordSecurity) => LandlordSecurity) => void;
  setTwoFAState: Dispatch<SetStateAction<{ setupMode: boolean; factorId: string; secret: string; verificationCode: string; confirmed: boolean; isVerifying: boolean; }>>;
  handleCancel2FASetup: () => void;
  handleVerify2FA: () => Promise<void>;
  handleSaveSecurity: () => Promise<void>;
  handleDeleteAccount: () => Promise<void>;
}

export const SecurityTab = ({
  security,
  passwordState,
  setPasswordState,
  handlePasswordChange,
  twoFAState,
  handleSetup2FA,
  updateSecurity,
  setTwoFAState,
  handleCancel2FASetup,
  handleVerify2FA,
  handleSaveSecurity,
  handleDeleteAccount,
}: SecurityTabProps) => (
  <div className="space-y-5">
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle
        icon="🔑"
        title="Password"
        subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Last changed: Not provided"}
      />
      <Field label="Current Password">
        <div className="relative">
          <SettingsInput
            type={passwordState.showCurrent ? "text" : "password"}
            placeholder="Enter current password"
            value={passwordState.current}
            onChange={(e: any) => setPasswordState((p) => ({ ...p, current: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => setPasswordState((p) => ({ ...p, showCurrent: !p.showCurrent }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {passwordState.showCurrent ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </Field>
      <Field label="New Password" hint="At least 8 characters with letters, numbers, and symbols">
        <div className="relative">
          <SettingsInput
            type={passwordState.showNew ? "text" : "password"}
            placeholder="New password"
            value={passwordState.new}
            onChange={(e: any) => setPasswordState((p) => ({ ...p, new: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => setPasswordState((p) => ({ ...p, showNew: !p.showNew }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {passwordState.showNew ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </Field>
      <Field label="Confirm New Password">
        <div className="relative">
          <SettingsInput
            type={passwordState.showConfirm ? "text" : "password"}
            placeholder="Repeat new password"
            value={passwordState.confirm}
            onChange={(e: any) => setPasswordState((p) => ({ ...p, confirm: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => setPasswordState((p) => ({ ...p, showConfirm: !p.showConfirm }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {passwordState.showConfirm ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </Field>
      <button
        className="px-5 py-2.5 bg-[#8B735B] hover:bg-[#756A60] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
        onClick={handlePasswordChange}
        disabled={passwordState.isChanging}
      >
        {passwordState.isChanging ? "Updating..." : "Update Password"}
      </button>
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="🛡️" title="Two-Factor Authentication" subtitle="Extra layer of protection for your account" />

      {!security.twoFactor && !twoFAState.setupMode ? (
        <>
          <div className="p-4 bg-[#FAF8F5] border-2 border-[#E8DED1] rounded-xl">
            <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">⚠️ Disabled – your account is less secure</p>
          </div>
          <button
            onClick={handleSetup2FA}
            className="w-full px-4 py-2.5 bg-[#8B735B] hover:bg-[#756A60] text-white text-sm font-black rounded-xl transition-colors"
          >
            Enable 2FA
          </button>
        </>
      ) : security.twoFactor && !twoFAState.setupMode ? (
        <>
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <p className="text-sm font-black text-slate-900">Two-Factor Authentication</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">✅ Enabled – your account is protected</p>
          </div>
          <Field label="2FA Method">
            <SettingsSelect value={security.twoFactorMethod} onChange={(e: any) => updateSecurity(p => ({ ...p, twoFactorMethod: e.target.value }))}>
              <option value="sms">SMS to mobile number</option>
              <option value="email">Email OTP</option>
              <option value="authenticator">Authenticator App (Google / Authy)</option>
            </SettingsSelect>
          </Field>
          <button
            onClick={() => {
              toast.success("2FA is already enabled");
            }}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
          >
            2FA Enabled
          </button>
        </>
      ) : (
        <>
          <div className="p-4 bg-[#FAF8F5] border-2 border-[#E8DED1] rounded-xl">
            <p className="text-sm font-black text-slate-900">Setup 2FA</p>
            <p className="text-xs text-[#756A60] font-medium mt-0.5">Follow the steps to enable two-factor authentication</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-slate-800">Step 1: Open your authenticator app</p>
            <p className="text-xs text-slate-600">Download Google Authenticator, Authy, or Microsoft Authenticator if you haven't already.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-slate-800">Step 2: Scan the QR code</p>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center h-40">
              <div className="text-slate-400 text-center">
                <p className="text-xs font-mono">{twoFAState.secret}</p>
                <p className="text-[10px] mt-2">(Or enter this code manually)</p>
              </div>
            </div>
          </div>
          <Field label="Verification Code">
            <SettingsInput
              type="text"
              placeholder="Enter 6-digit code"
              value={twoFAState.verificationCode}
              onChange={(e: any) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFAState((p) => ({ ...p, verificationCode: val }));
              }}
              maxLength={6}
            />
          </Field>
          <div className="flex gap-3">
            <button
              onClick={handleCancel2FASetup}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify2FA}
              disabled={twoFAState.isVerifying || twoFAState.verificationCode.length !== 6}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-colors"
            >
              {twoFAState.isVerifying ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </>
      )}
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="💻" title="Login & Sessions" subtitle="Manage active sessions and login security" />
      <div className="space-y-3">
        {[
          { key: "loginAlerts",     label: "Login Alerts",              hint: "Get notified when your account is accessed from a new device or location" },
          { key: "trustedDevices",  label: "Remember Trusted Devices",  hint: "Skip 2FA on devices you've verified before" },
        ].map(({ key, label, hint }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">{label}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
            </div>
            <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
          </div>
        ))}
        <Field label="Auto Session Timeout" hint="Automatically log out after inactivity">
          <SettingsSelect value={security.sessionTimeout} onChange={(e: any) => updateSecurity(p => ({ ...p, sessionTimeout: e.target.value }))}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="240">4 hours</option>
            <option value="0">Never</option>
          </SettingsSelect>
        </Field>
      </div>

      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Sessions</p>
        <div className="space-y-2">
          {security.activeDevices.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-medium text-slate-500">No active session data is available.</div>
          )}
          {security.activeDevices.map((d: (typeof security.activeDevices)[number]) => (
            <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${d.current ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{d.name.includes("iPhone") || d.name.includes("Android") ? "📱" : "💻"}</span>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {d.name}
                    {d.current && <span className="ml-2 text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">THIS DEVICE</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">{d.location} · {d.lastActive}</p>
                </div>
              </div>
              {!d.current && (
                <button
                  onClick={() => updateSecurity(p => ({ ...p, activeDevices: p.activeDevices.filter((x: (typeof p.activeDevices)[number]) => x.id !== d.id) }))}
                  className="text-xs font-black text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="📧" title="Account Recovery" subtitle="Backup contacts if you lose access to your account" />
      <Field label="Recovery Email" hint="Must be different from your primary email">
        <SettingsInput type="email" value={security.recoveryEmail} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryEmail: e.target.value }))} placeholder="backup@email.com" />
      </Field>
      <Field label="Recovery Mobile Number">
        <SettingsInput type="tel" value={security.recoveryMobile} onChange={(e: any) => updateSecurity(p => ({ ...p, recoveryMobile: e.target.value }))} placeholder="09XXXXXXXXX" />
      </Field>
    </div>

    <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="🔐" title="Privacy & Data" subtitle="Control how your data is used on the platform" />
      {[
        { key: "profileIndexing",  label: "Allow search engine indexing",         hint: "Your profile may appear in Google / Bing search results" },
        { key: "analyticsConsent", label: "Share usage analytics",                hint: "Help improve the platform with anonymous usage data" },
        { key: "dataSharing",      label: "Share data with third-party partners", hint: "Used for fraud detection and identity verification services" },
      ].map(({ key, label, hint }) => (
        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
          </div>
          <Toggle checked={(security as any)[key]} onChange={(v) => updateSecurity(p => ({ ...p, [key]: v }))} />
        </div>
      ))}
    </div>

    <Button onClick={handleSaveSecurity} className="w-full bg-[#8B735B] hover:bg-[#756A60] text-white rounded-xl font-bold shadow-md shadow-[#E8DED1]">
      Save Security Settings
    </Button>

    <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 space-y-4">
      <SectionTitle icon="⚠️" title="Danger Zone" subtitle="Irreversible account actions" />
      <p className="text-xs text-slate-600 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
      <Button variant="destructive" className="w-full rounded-xl font-bold" onClick={handleDeleteAccount}>
        Delete My Account
      </Button>
    </div>
  </div>
);
