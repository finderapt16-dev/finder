import type { InputHTMLAttributes } from "react";

export const SettingsInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#E8DED1] bg-white text-sm font-semibold text-[#302820] placeholder-[#C9B8A5] focus:outline-none focus:ring-2 focus:ring-[#C9B8A5] focus:border-[#8B735B] transition-all"
  />
);
