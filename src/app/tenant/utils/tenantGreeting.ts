export type TenantGreetingPeriod = "morning" | "afternoon" | "evening";

export function getTenantGreetingPeriod(date = new Date()): TenantGreetingPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function getTenantFirstName(name: string | null | undefined): string {
  const firstName = name?.trim().split(/\s+/)[0] ?? "";
  return firstName && !firstName.includes("@") ? firstName : "";
}

export function getTimeBasedGreeting(name: string | null | undefined, date = new Date()): string {
  const firstName = getTenantFirstName(name);
  return `Good ${getTenantGreetingPeriod(date)}${firstName ? `, ${firstName}` : ""}!`;
}
