import { Button } from "@/app/shared/components/ui/button";
import { type LucideIcon } from "lucide-react";

export const EmptyState = ({
  icon: Icon,
  message,
  actionLabel,
  action,
}: {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  action?: () => void;
}) => (
  <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#8B735B]">
      <Icon className="h-7 w-7" />
    </span>
    <p className="max-w-md text-base font-bold text-slate-700">{message}</p>
    {actionLabel && action && (
      <Button onClick={action} className="mt-5 rounded-lg bg-[#8B735B] font-black text-white hover:bg-[#756A60]">
        {actionLabel}
      </Button>
    )}
  </div>
);
