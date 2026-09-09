import type { SelectHTMLAttributes } from "react";

export const SettingsSelect = ({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#E8DED1] bg-white text-sm font-semibold text-[#302820] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] transition-all"
  >
    {children}
  </select>
);
