import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import { Bell, Building2, Settings, Shield, User } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  profileTab: ReactNode;
  alertsTab: ReactNode;
  businessTab: ReactNode;
  securityTab: ReactNode;
}

export const SettingsSection = ({ settingsTab, setSettingsTab, profileTab, alertsTab, businessTab, securityTab }: SettingsSectionProps) => {

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="landlord-settings mx-auto max-w-[1500px] space-y-5 pb-8 [&_.rounded-2xl]:rounded-lg [&_.rounded-xl]:rounded-md [&_.border-2]:border">
      <div className="rounded-lg border border-[#E8DED1] bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-lg border border-[#E8DED1] bg-[#FAF8F5] text-[#8B735B] shadow-sm"><Settings className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Settings</h1><p className="mt-1 text-sm font-medium text-slate-500">Manage your account, preferences, business information, and security.</p></div>
        </div>
      </div>

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm sm:grid-cols-4">
          <TabsTrigger value="profile" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
            <User className="h-3.5 w-3.5 mr-1.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="alerts" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="business" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
            <Building2 className="h-3.5 w-3.5 mr-1.5" /> Business
          </TabsTrigger>
          <TabsTrigger value="security" className="min-h-11 rounded-md font-bold data-[state=active]:bg-[#F3EFEA] data-[state=active]:text-[#8B735B] data-[state=active]:shadow-sm">
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">{profileTab}</TabsContent>
        <TabsContent value="alerts" className="mt-0">{alertsTab}</TabsContent>
        <TabsContent value="business" className="mt-0">{businessTab}</TabsContent>
        <TabsContent value="security" className="mt-0">{securityTab}</TabsContent>
      </Tabs>
    </motion.div>
  );
};
