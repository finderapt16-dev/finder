import { useAuth } from "@/app/shared/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTenantRole } from "@/app/shared/services/authService";

const AdminDashboard = lazy(() => import("@/app/admin/pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const SuperAdminDashboard = lazy(() => import("@/app/super-admin/pages/SuperAdminDashboard").then((module) => ({ default: module.SuperAdminDashboard })));
const LandlordDashboard = lazy(() => import("@/app/landlord/pages/LandlordDashboard").then((module) => ({ default: module.LandlordDashboard })));
const StudentEmployeeDashboard = lazy(() => import("@/app/tenant/pages/StudentEmployeeDashboard").then((module) => ({ default: module.StudentEmployeeDashboard })));

function DashboardLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-sm font-semibold text-slate-600">Loading your dashboard...</div>;
}

export function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <DashboardLoader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show appropriate dashboard based on role
  if (user?.role === "super_admin") {
    if (!location.pathname.startsWith("/super-admin")) {
      return <Navigate to={`/super-admin${location.search}`} replace />;
    }
    return <Suspense fallback={<DashboardLoader />}><SuperAdminDashboard /></Suspense>;
  }

  if (user?.role === "admin") {
    return <Suspense fallback={<DashboardLoader />}><AdminDashboard /></Suspense>;
  }

  if (user?.role === "landlord") {
    return <Suspense fallback={<DashboardLoader />}><LandlordDashboard /></Suspense>;
  }

  if (isTenantRole(user?.role)) {
    if (!new URLSearchParams(location.search).get("section")) {
      return <Navigate to="/browse" replace />;
    }
    return <Suspense fallback={<DashboardLoader />}><StudentEmployeeDashboard /></Suspense>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-black text-slate-900">Account role unavailable</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          Your account role is missing or invalid. Please contact support before continuing.
        </p>
      </div>
    </div>
  );
}

