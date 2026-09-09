import { Button } from "@/app/shared/components/ui/button";
import { Camera, RotateCcw } from "lucide-react";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { SettingsField as Field } from "@/app/landlord/components/settings/SettingsField";
import { SettingsInput } from "@/app/landlord/components/settings/SettingsInput";
import { SettingsTextarea } from "@/app/landlord/components/settings/SettingsTextarea";
import { SettingsSectionTitle as SectionTitle } from "@/app/landlord/components/settings/SettingsSectionTitle";
import type { LandlordProfile } from "@/app/landlord/types/settings";

interface ProfileTabProps {
  profile: LandlordProfile;
  isUploadingProfilePhoto: boolean;
  profilePhotoInputRef: RefObject<HTMLInputElement>;
  handleRemoveProfilePhoto: () => Promise<void>;
  handleProfilePhoto: (file?: File) => Promise<void>;
  updateProfile: (updater: (prev: LandlordProfile) => LandlordProfile) => void;
  setProfile: Dispatch<SetStateAction<LandlordProfile>>;
  savedProfile: LandlordProfile;
  handleUpdateProfile: () => Promise<void>;
  isUpdatingProfile: boolean;
}

export const ProfileTab = ({
  profile,
  isUploadingProfilePhoto,
  profilePhotoInputRef,
  handleRemoveProfilePhoto,
  handleProfilePhoto,
  updateProfile,
  setProfile,
  savedProfile,
  handleUpdateProfile,
  isUpdatingProfile,
}: ProfileTabProps) => (
  <div className="grid gap-5">
    <div className="flex flex-col gap-5 rounded-lg border border-[#E8DED1] bg-[#FAF8F5] p-6 shadow-sm sm:flex-row sm:items-center">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#8B735B] text-3xl font-black text-white shadow-lg">
        {profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName || "Landlord"} profile`} className="h-full w-full object-cover" /> : (profile.firstName[0] || "L").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-black text-slate-950">{`${profile.firstName} ${profile.lastName}`.trim() || "Not provided"}</p>
        <p className="mb-4 text-sm font-medium text-slate-500">{profile.email || "Email not provided"}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={isUploadingProfilePhoto} onClick={() => profilePhotoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md bg-[#8B735B] px-4 py-2 text-xs font-black text-white hover:bg-[#756A60] disabled:opacity-50"><Camera className="h-4 w-4" />{isUploadingProfilePhoto ? "Uploading..." : "Upload Photo"}</button>
          <button type="button" disabled={!profile.avatar || isUploadingProfilePhoto} onClick={() => void handleRemoveProfilePhoto()} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">Remove Photo</button>
          <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])} />
        </div>
      </div>
    </div>

    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionTitle icon="👤" title="Personal Information" subtitle="Your public-facing landlord profile" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name">
          <SettingsInput value={profile.firstName} onChange={(e: any) => updateProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
        </Field>
        <Field label="Last Name">
          <SettingsInput value={profile.lastName} onChange={(e: any) => updateProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
        </Field>
      </div>
      <Field label="Email Address" hint="Used for account login and notifications">
        <SettingsInput type="email" value={profile.email} onChange={(e: any) => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
      </Field>
      <Field label="Mobile Number" hint="Visible to tenants if enabled in Business settings">
        <SettingsInput type="tel" value={profile.mobile} onChange={(e: any) => updateProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX" />
      </Field>
      <Field label="Bio / About You" hint="Shown on your landlord profile page (max 300 characters)">
        <SettingsTextarea rows={3} value={profile.bio} onChange={(e: any) => updateProfile(p => ({ ...p, bio: e.target.value.slice(0, 300) }))} placeholder="Tell tenants about yourself…" />
        <p className="text-[11px] text-slate-400 font-medium text-right">{profile.bio.length}/300</p>
      </Field>
    </div>

    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="outline" onClick={() => setProfile(savedProfile)} className="rounded-md font-bold"><RotateCcw className="mr-2 h-4 w-4" />Reset Changes</Button>
      <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="rounded-md bg-[#8B735B] font-bold text-white hover:bg-[#756A60]">{isUpdatingProfile ? "Saving..." : "Save Changes"}</Button>
    </div>
  </div>
);
