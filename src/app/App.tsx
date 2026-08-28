import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { hasSupabaseConfig } from "@/lib/supabaseClient";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { router } from "./routes";

function App() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          const captureWaitingWorker = () => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              setWaitingWorker(registration.waiting);
            }
          };

          captureWaitingWorker();
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            installingWorker?.addEventListener("statechange", () => {
              if (installingWorker.state === "installed") captureWaitingWorker();
            });
          });
        })
        .catch((registrationError) => {
          console.error("Service worker registration failed.", registrationError);
        });
    };

    if ("serviceWorker" in navigator) {
      if (import.meta.env.DEV) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => void registration.unregister());
        });

        if ("caches" in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => void caches.delete(cacheName));
          });
        }
      } else {
        if (document.readyState === "complete") {
          registerServiceWorker();
        } else {
          window.addEventListener("load", registerServiceWorker);
        }
      }
    }

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  useEffect(() => {
    if (!waitingWorker) return;
    const handleControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange, { once: true });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
  }, [waitingWorker]);

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
            Deployment setup needed
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Apartment Finder is missing its Supabase connection.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Add these environment variables in Vercel, then redeploy the project:
          </p>
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100">
            <div>VITE_SUPABASE_URL</div>
            <div>VITE_SUPABASE_ANON_KEY</div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            Vercel path: Project Settings, Environment Variables, Production.
          </p>
        </section>
      </main>
    );
  }

  const app = (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );

  return (
    <>
      {app}
      {waitingWorker && (
        <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[200] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-orange-200 bg-white p-3 shadow-2xl" role="status">
          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-700">A new AptFindr version is ready.</p>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
            onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
          >
            Update
          </button>
        </div>
      )}
    </>
  );
}

export default App;
