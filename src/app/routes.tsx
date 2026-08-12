import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { ApartmentsProvider } from "./shared/contexts/ApartmentsContext";
import { Root } from "./shared/layouts/Root";

const AdminApartmentDetail = lazy(() => import("./admin/pages/AdminApartmentDetail").then((module) => ({ default: module.AdminApartmentDetail })));
const AddApartment = lazy(() => import("./landlord/pages/AddApartment").then((module) => ({ default: module.AddApartment })));
const ManageRooms = lazy(() => import("./landlord/pages/ManageRooms").then((module) => ({ default: module.ManageRooms })));
const ForgotPassword = lazy(() => import("./public/forgot-password/ForgotPassword").then((module) => ({ default: module.ForgotPassword })));
const Landing = lazy(() => import("./public/landing/Landing").then((module) => ({ default: module.Landing })));
const Login = lazy(() => import("./public/login/Login").then((module) => ({ default: module.Login })));
const NotFound = lazy(() => import("./public/not-found/NotFound").then((module) => ({ default: module.NotFound })));
const Signup = lazy(() => import("./public/signup/Signup").then((module) => ({ default: module.Signup })));
const Dashboard = lazy(() => import("./shared/pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Settings = lazy(() => import("./shared/pages/settings/Settings").then((module) => ({ default: module.Settings })));
const DesignGuide = lazy(() => import("./shared/pages/tools/DesignGuide").then((module) => ({ default: module.DesignGuide })));
const Flowchart = lazy(() => import("./shared/pages/tools/Flowchart").then((module) => ({ default: module.Flowchart })));
const ApartmentDetail = lazy(() => import("./tenant/pages/ApartmentDetail").then((module) => ({ default: module.ApartmentDetail })));
const Favorites = lazy(() => import("./tenant/pages/Favorites").then((module) => ({ default: module.Favorites })));
const Home = lazy(() => import("./tenant/pages/Home").then((module) => ({ default: module.Home })));
const AuthCallback = lazy(() => import("./public/auth-callback/AuthCallback").then((module) => ({ default: module.AuthCallback })));

const APARTMENT_LOGIN_MESSAGE = "Please sign in or create an account to view apartment details.";

function PageLoader({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading page...</div>}>
      {children}
    </Suspense>
  );
}

function PublicLandingRoute() {
  return (
    <ApartmentsProvider>
      <PageLoader><Landing /></PageLoader>
    </ApartmentsProvider>
  );
}

export const router = createBrowserRouter([
  // Standalone pages — no Root wrapper (no app Header / Chatbot)
  { path: "/flowchart", element: <PageLoader><Flowchart /></PageLoader> },
  { path: "/design-guide", element: <PageLoader><DesignGuide /></PageLoader> },
  { path: "/", element: <PublicLandingRoute /> },
  { path: "/auth/callback", element: <PageLoader><AuthCallback /></PageLoader> },

  // Main app wrapped in Root layout
  {
    path: "/",
    element: <Root />,
    children: [
      { path: "browse", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><Home /></PageLoader></ProtectedRoute> },
      { path: "apartment/:id", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><ApartmentDetail /></PageLoader></ProtectedRoute> },
      { path: "admin/apartment/:id", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader><AdminApartmentDetail /></PageLoader></ProtectedRoute> },
      { path: "add-apartment", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><AddApartment /></PageLoader></ProtectedRoute> },
      { path: "landlord/properties/:id/rooms", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ManageRooms /></PageLoader></ProtectedRoute> },
      { path: "favorites", element: <ProtectedRoute><PageLoader><Favorites /></PageLoader></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute><PageLoader><Settings /></PageLoader></ProtectedRoute> },
      { path: "dashboard", element: <ProtectedRoute><PageLoader><Dashboard /></PageLoader></ProtectedRoute> },
      { path: "admin", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader><Dashboard /></PageLoader></ProtectedRoute> },
      { path: "login", element: <PageLoader><Login /></PageLoader> },
      { path: "signup", element: <PageLoader><Signup /></PageLoader> },
      { path: "forgot-password", element: <PageLoader><ForgotPassword /></PageLoader> },
      { path: "*", element: <PageLoader><NotFound /></PageLoader> },
    ],
  },
]);
