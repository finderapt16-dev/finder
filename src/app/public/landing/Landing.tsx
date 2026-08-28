import { AppLogo } from "@/app/shared/components/common/AppLogo";
import { ImageWithFallback } from "@/app/shared/components/figma/ImageWithFallback";
import { LandingListingsSection } from "./LandingApartmentPreview";
import { Button } from "@/app/shared/components/ui/button";
import locationMapIllustration from "@/assets/landing/location-map-illustration.png";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/app/shared/components/ui/sheet";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import type { Apartment } from "@/app/shared/data/apartments";
import { isTenantVisibleApartment } from "@/app/shared/utils/listingVisibility";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Flag,
  Heart,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  TrendingUp,
  UserCheck,
  Zap
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ─── Animation helpers ──────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero images ───────────────────────────────────────── */
const heroImages = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
];

/* ─── Barangay data ─────────────────────────────────────── */
const normalizeLocationKey = (value: string) => value
  .toLocaleLowerCase("en-PH")
  .replace(/\b(?:barangay|brgy)\.?\s*/g, "")
  .replace(/\b(?:sto|santo)\.?\s+/g, "sto ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const getLocationSearchTerm = (value: string) => normalizeLocationKey(value).replace(/^sto\s+/, "");

const formatLocationName = (value: string) => value
  .replace(/\b(?:barangay|brgy)\.?\s*/gi, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("en-PH")
  .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-PH"))
  .replace(/^Sto\s+/i, "Sto. ");

const genericLocationKey = /^(?:la paz|lapaz|iloilo|iloilo city|iloilo province|western visayas|philippines|5000)$/;
const streetAddressPattern = /^\d|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|block|blk\.?|lot|house|unit)\b/i;

const getInventoryLocation = (apartment: Apartment): string | null => {
  const scopeText = [apartment.city, apartment.state, apartment.address, apartment.location].filter(Boolean).join(" ");
  if (!/\bla\s*paz\b/i.test(scopeText) || !/\biloilo\b/i.test(scopeText)) return null;

  const candidates = [apartment.location, apartment.city]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(","))
    .concat((apartment.address || "").split(",").reverse());

  for (const candidate of candidates) {
    const displayName = formatLocationName(candidate);
    const key = normalizeLocationKey(displayName);
    if (!key || genericLocationKey.test(key) || streetAddressPattern.test(displayName)) continue;
    return displayName;
  }

  return null;
};

export function Landing() {
  const { user } = useAuth();
  const { apartments, isLoading: apartmentsLoading } = useApartmentsContext();
  const navigate = useNavigate();
  const [landingSearch, setLandingSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [budget, setBudget] = useState("");
  const [roomType, setRoomType] = useState("");
  const [rooms, setRooms] = useState("");
  const [availability, setAvailability] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const inventoryLocations = useMemo(() => {
    const grouped = new Map<string, { name: string; count: number }>();

    apartments.filter(isTenantVisibleApartment).forEach((apartment) => {
      const name = getInventoryLocation(apartment);
      if (!name) return;
      const key = normalizeLocationKey(name);
      const existing = grouped.get(key);
      grouped.set(key, existing ? { ...existing, count: existing.count + 1 } : { name, count: 1 });
    });

    return [...grouped.values()]
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "en-PH"))
      .slice(0, 6);
  }, [apartments]);

  useEffect(() => {
    const timer = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";

  const handleProtectedAction = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      const destination = e.currentTarget.getAttribute("href") || "/browse";
      navigate(`/login?redirect=${encodeURIComponent(destination)}`, {
        state: { message: "Please sign in or create an account to view apartment details." },
      });
    }
  };

  const handleLandingSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (landingSearch.trim()) params.set("search", landingSearch.trim());
    if (budget) params.set("budget", budget);
    if (roomType) params.set("type", roomType);
    if (rooms) params.set("rooms", rooms);
    if (availability) params.set("availability", availability);
    const destination = params.toString() ? `/browse?${params}` : "/browse";
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(destination)}`, {
        state: { message: "Please sign in or create an account to view apartment details." },
      });
      return;
    }
    navigate(destination);
  };

  const activeFiltersCount = [budget, roomType, rooms, availability].filter(Boolean).length;

  return (
    <div className="landing-palette flex min-h-screen flex-col overflow-x-hidden bg-white">

      {/* ─── Sticky Header ──────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-xl border-b border-slate-200" : "bg-white/90 backdrop-blur-xl border-b border-transparent"
        }`}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <AppLogo className="h-10 w-10 rounded-xl transition-all group-hover:scale-105" iconClassName="h-5 w-5" />
              <div>
                <span className="text-xl font-black text-slate-950">
                  AptFindr
                </span>
                <p className="text-[10px] text-slate-400 font-semibold -mt-0.5 leading-none">La Paz, Iloilo City</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { to: "/browse", label: "Browse", protected: true },
                { to: "/favorites", label: "Favorites", protected: true, icon: <Heart className="h-3.5 w-3.5" /> },
              ].map(({ to, label, protected: isProtected, icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={isProtected ? handleProtectedAction : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors rounded-lg ${
                    "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                  }`}
                >
                  {icon}{label}
                </Link>
              ))}
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-current/20">
                {!user ? (
                  <>
                    <Link to="/login">
                      <Button variant="ghost" size="sm" className="font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950">
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" className="rounded-lg border border-slate-900 bg-slate-950 px-5 font-semibold text-white shadow-none hover:bg-slate-800">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={dashboardPath}>
                    <Button size="sm" className="rounded-lg border border-slate-900 bg-slate-950 px-5 font-semibold text-white shadow-none hover:bg-slate-800">
                      Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </nav>

            <Sheet>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 hover:bg-white/10">
                <Menu className="h-5 w-5 text-slate-700" />
              </SheetTrigger>
              <SheetContent className="border-slate-200 bg-white">
                <SheetTitle className="text-slate-950">Menu</SheetTitle>
                <SheetDescription className="text-slate-500">AptFindr — La Paz, Iloilo City</SheetDescription>
                <nav className="flex flex-col gap-2 mt-8">
                  {[
                    { to: "/browse", label: "Browse Apartments", protected: true },
                    { to: "/favorites", label: "Favorites", protected: true },
                    ...(!user ? [{ to: "/login", label: "Login", protected: false }, { to: "/signup", label: "Sign Up", protected: false }] : [{ to: dashboardPath, label: "Dashboard", protected: false }]),
                  ].map(({ to, label, protected: isProtected }) => (
                    <Link key={to} to={to} onClick={isProtected ? handleProtectedAction : undefined}
                      className="rounded-xl px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950">
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="order-1 bg-white pt-16">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10">
          <motion.div className="relative z-20 min-w-0 py-10 text-left sm:py-12 lg:py-14 xl:py-16" initial="hidden" animate="show" variants={stagger}>

            <motion.div variants={fadeUp} className="mb-4 inline-flex max-w-full items-center gap-2 border-0 bg-transparent px-0 py-1 sm:mb-5">
              <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <MapPin className="h-4 w-4 text-[#8B735B]" />
              </motion.span>
              <span className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.16em] text-[#8B735B] sm:text-sm">Apartment listings in La Paz, Iloilo City</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="mb-5 max-w-[520px] text-5xl font-black leading-[1.01] tracking-[-0.04em] text-slate-950 sm:text-[52px] lg:text-[50px] xl:text-[56px]">
              <span className="block">Find Apartments</span>
              <span className="relative block">
                <span className="text-slate-950">That Fit Your Needs</span>
                <motion.div
                  className="hidden"
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.7 }}
                />
              </span>
              <span className="block">in La Paz</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mb-7 max-w-[500px] text-base leading-relaxed text-slate-600 sm:mb-8 sm:text-lg">
              Browse apartments, compare rental options, view locations, and review room, amenity, and verification information.
            </motion.p>

            {/* ── Search panel ── */}
            <motion.div variants={fadeUp} className="relative z-20 w-full max-w-[600px] min-w-0 overflow-hidden rounded-[14px] border border-[#E8DED1] bg-white shadow-[0_2px_10px_rgba(48,40,32,0.04)]">
              <form className="min-w-0" onSubmit={handleLandingSearch}>
                {/* Main search bar */}
                <div className="grid grid-cols-2 items-center gap-1.5 p-1.5 sm:flex">
                  <div className="relative col-span-2 min-w-0 flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B735B]" />
                    <input
                      value={landingSearch}
                      onChange={(e) => setLandingSearch(e.target.value)}
                      placeholder="Search by area, address, or apartment name..."
                      className="h-11 min-w-0 w-full rounded-[10px] border border-transparent bg-white py-2.5 pl-12 pr-4 text-base font-medium text-[#302820] placeholder:text-[#8B8178] focus:border-[#E8DED1] focus:outline-none focus:ring-2 focus:ring-[#8B735B]/10"
                    />
                  </div>
                  <button type="button" onClick={() => setShowFilters(!showFilters)}
                    className={`relative flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border px-3 text-sm font-semibold transition-all sm:w-[88px] ${
                      showFilters || activeFiltersCount > 0
                        ? "border-[#8B735B] bg-[#FAF8F5] text-[#8B735B]"
                        : "border-[#E8DED1] bg-white text-[#756A60] hover:bg-[#FAF8F5] hover:text-[#8B735B]"
                    }`}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#8B735B] text-xs font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                  <Button type="submit"
                    className="h-11 w-full whitespace-nowrap rounded-[10px] bg-[#8B735B] px-4 text-[15px] font-bold text-white shadow-none hover:bg-[#75614E] sm:w-[88px]">
                    Search
                  </Button>
                </div>

                {/* Quick filters panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-3 border-t border-[#E8DED1] px-3 pb-3 pt-3 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <DollarSign className="inline h-3 w-3 mr-1" />Budget
                          </label>
                          <select value={budget} onChange={(e) => setBudget(e.target.value)}
                            className="w-full rounded-lg border border-[#E8DED1] bg-white px-3 py-2.5 text-sm text-[#302820] focus:border-[#8B735B] focus:outline-none focus:ring-2 focus:ring-[#8B735B]/10">
                            <option value="">Any budget</option>
                            <option value="0-3000">Under ₱3,000</option>
                            <option value="3000-5000">₱3,000–5,000</option>
                            <option value="5000-8000">₱5,000–8,000</option>
                            <option value="8000+">₱8,000+</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <Building2 className="inline h-3 w-3 mr-1" />Type
                          </label>
                          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}
                            className="w-full rounded-lg border border-[#E8DED1] bg-white px-3 py-2.5 text-sm text-[#302820] focus:border-[#8B735B] focus:outline-none focus:ring-2 focus:ring-[#8B735B]/10">
                            <option value="">All types</option>
                            <option value="apartment">Apartment</option>
                            <option value="studio">Studio</option>
                            <option value="family">Family Unit</option>
                            <option value="furnished">Furnished Unit</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <BedDouble className="inline h-3 w-3 mr-1" />Rooms
                          </label>
                          <select value={rooms} onChange={(e) => setRooms(e.target.value)}
                            className="w-full rounded-lg border border-[#E8DED1] bg-white px-3 py-2.5 text-sm text-[#302820] focus:border-[#8B735B] focus:outline-none focus:ring-2 focus:ring-[#8B735B]/10">
                            <option value="">Any</option>
                            <option value="1">1 Room</option>
                            <option value="2">2 Rooms</option>
                            <option value="3">3 Rooms</option>
                            <option value="4+">4+ Rooms</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <CalendarCheck className="inline h-3 w-3 mr-1" />Available
                          </label>
                          <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                            className="w-full rounded-lg border border-[#E8DED1] bg-white px-3 py-2.5 text-sm text-[#302820] focus:border-[#8B735B] focus:outline-none focus:ring-2 focus:ring-[#8B735B]/10">
                            <option value="">Any time</option>
                            <option value="now">Available now</option>
                            <option value="soon">Available soon</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>

          </motion.div>
          <div className="relative h-[320px] min-w-0 overflow-hidden rounded-3xl border border-slate-200 sm:h-[420px] lg:h-[580px] lg:rounded-none lg:rounded-bl-[48px] lg:border-0 xl:h-[610px]">
            <AnimatePresence mode="sync">
              <motion.div key={heroIndex} className="absolute inset-0" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                <ImageWithFallback src={heroImages[heroIndex]} alt="Apartment in La Paz" className="h-full w-full object-cover object-center" />
              </motion.div>
            </AnimatePresence>
          </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Listings (preserved component) ─────────── */}
      <div className="order-3 bg-white">
        <LandingListingsSection onBrowseClick={handleProtectedAction} />
      </div>

      {/* ─── Browse by Location ───────────────────────────────── */}
      <section className="landing-location-section order-5 border-y border-[#E8DED1] bg-[#FAF8F5] py-14 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid items-center gap-x-8 gap-y-6 md:grid-cols-[.9fr_1.1fr] lg:gap-x-12">
            <AnimatedSection className="order-1 md:col-start-2 md:row-start-1">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8B735B]">Explore the area</p>
              <h2 className="mb-3 text-3xl font-black text-[#302820] md:text-4xl">Browse by Location</h2>
              <p className="max-w-lg text-base text-[#756A60]">Apartments across barangays within La Paz, Iloilo City</p>
            </AnimatedSection>
            <AnimatedSection className="order-2 flex items-center justify-center md:col-start-1 md:row-span-2 md:row-start-1" delay={0.08}>
              <img src={locationMapIllustration} alt="" className="landing-dimensional-art h-auto w-full object-contain" />
            </AnimatedSection>

            <div className="landing-location-directory order-3 grid grid-cols-1 border-t border-[#E8DED1] sm:grid-cols-2 md:col-start-2 md:row-start-2 xl:grid-cols-3">
              {inventoryLocations.map(({ name, count }, i) => (
                <AnimatedSection key={name} delay={i * 0.07}>
                  <Link to={`/browse?search=${encodeURIComponent(getLocationSearchTerm(name))}`} onClick={handleProtectedAction}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      className="group flex min-h-24 cursor-pointer items-center gap-3 border-b border-[#E8DED1] px-3 py-5 transition-colors hover:bg-white/60"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-[#8B735B]" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-snug text-[#302820] transition-colors group-hover:text-[#8B735B]">{name}</p>
                        <p className="mt-1 text-xs font-medium text-[#756A60]">{count} {count === 1 ? "apartment" : "apartments"}</p>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-[#8B735B] transition-transform group-hover:translate-x-1" />
                    </motion.div>
                  </Link>
                </AnimatedSection>
              ))}
              {!apartmentsLoading && inventoryLocations.length === 0 && (
                <p className="col-span-full border-b border-[#E8DED1] px-3 py-8 text-sm font-medium text-[#756A60]">
                  No apartment locations available yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Who It's For ────────────────────────────────────── */}
      <section className="order-9 bg-white py-14 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">For the community</p>
            <h2 className="mb-3 text-3xl font-black text-slate-950 md:text-4xl">Built for Tenants and Landlords</h2>
            <p className="mx-auto max-w-xl text-slate-500">Practical tools for finding and managing apartments in La Paz.</p>
          </AnimatedSection>

          <div className="landing-user-directory mx-auto grid max-w-4xl grid-cols-1 border-y border-[#E8DED1] sm:grid-cols-2">
            {[
              { icon: Search, role: "Tenants", desc: "Find and compare apartments by location, budget, amenities, room availability, and saved preferences." },
              { icon: Building2, role: "Landlords", desc: "Create and manage properties, rooms, availability, listing information, and verification requirements." },
            ].map(({ icon: Icon, role, desc }, i) => (
              <AnimatedSection key={role} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="h-full p-6"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center text-[#8B735B]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-black text-slate-950">{role}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ───────────────────────────────────── */}
      <section className="order-6 bg-white py-14 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">Platform features</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Useful Information in One Place</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Review listings and manage properties using recorded platform information.</p>
          </AnimatedSection>

          <div className="landing-information-grid mx-auto grid max-w-6xl grid-cols-1 border-y border-[#E8DED1] md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Landlord Verification Status", desc: "Review the verification status shown for landlords before exploring a listing.", color: "text-[#756A60]", bg: "bg-[#FAF8F5]", border: "border-[#F3EFEA]" },
              { icon: ShieldCheck, title: "Verification Information", desc: "Landlords submit required information for administrative review through the platform.", color: "text-[#756A60]", bg: "bg-[#FAF8F5]", border: "border-[#F3EFEA]" },
              { icon: Flag, title: "Listing Reports", desc: "Users can report inaccurate or concerning listing information for administrator review.", color: "text-rose-600", bg: "bg-[#FAF8F5]", border: "border-rose-100" },
              { icon: MapIcon, title: "GIS Map View", desc: "Compare apartment locations in La Paz and review nearby listing options.", color: "text-[#756A60]", bg: "bg-[#FAF8F5]", border: "border-[#F3EFEA]" },
              { icon: TrendingUp, title: "Listing Activity", desc: "Landlords can monitor recorded views and favorites, while renters receive suggestions based on their preferences.", color: "text-[#756A60]", bg: "bg-[#FAF8F5]", border: "border-[#E8DED1]" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <AnimatedSection key={title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className="h-full p-6"
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center text-[#8B735B]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section className="order-7 border-y border-slate-100 bg-slate-50/60 py-14 md:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">Simple process</p>
            <h2 className="mb-3 text-3xl font-black text-slate-900 md:text-4xl">How AptFindr Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Create an account, review listings, and compare suitable options.</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* connector line */}
            <div className="absolute left-1/4 right-1/4 top-[52px] hidden border-t border-dashed border-slate-300 md:block" />

            {[
              { icon: UserCheck, title: "Create your account", desc: "Register as a renter or landlord. Landlords can then submit verification information for review." },
              { icon: Search, title: "Browse and compare", desc: "Filter apartments, review rooms and amenities, save favorites, and compare locations on the map." },
              { icon: CheckCircle2, title: "Review your options", desc: "Use listing details, availability, verification status, and personalized suggestions to compare rentals." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <AnimatedSection key={title} delay={i * 0.12}>
                <motion.div whileHover={{ y: -2 }} className="relative bg-transparent px-6 py-8 text-center">
                  <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center text-[#8B735B]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-[#FAF8F5] px-3 text-xs font-black tracking-[0.18em] text-[#8B735B]">
                    0{i + 1}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="landing-final-cta relative order-10 overflow-hidden border-y border-slate-200 bg-slate-950 py-14 md:py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/20 backdrop-blur rounded-full border border-white/30">
              <Zap className="h-4 w-4 text-[#8B735B]" />
              <span className="text-sm font-bold text-[#302820]">Ready to review available apartments?</span>
            </div>
            <h2 className="mb-5 text-4xl font-black leading-tight text-[#302820] md:text-5xl">
              Explore apartment<br />listings in La Paz
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#756A60]">
              Create an account to browse listings, use the map view, save favorites, and receive suggestions based on your preferences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="inline-flex h-auto items-center gap-2 rounded-xl bg-[#8B735B] px-8 py-4 text-base font-black text-white shadow-none hover:bg-[#756A60]">
                  <UserCheck className="h-5 w-5" />
                  Create Account
                </Button>
              </Link>
              <Link to="/browse" onClick={handleProtectedAction}>
                <Button size="lg" variant="outline" className="inline-flex h-auto items-center gap-2 rounded-xl border border-[#E8DED1] bg-white px-8 py-4 text-base font-bold text-[#302820] hover:bg-[#FAF8F5]">
                  <Building2 className="h-5 w-5" />
                  Browse Listings
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="order-[11] border-t border-slate-200 bg-white pb-8 pt-16 text-slate-500">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <AppLogo className="h-10 w-10 rounded-xl" iconClassName="h-5 w-5" />
                <span className="text-xl font-black text-slate-950">AptFindr</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-xs text-sm">
                A Progressive Web Application for apartment discovery and listing management in La Paz, Iloilo City. Academic thesis project.
              </p>
              <div className="flex gap-3 mt-5">
                <a href="mailto:rentiloilo@example.com" className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#A68B70] transition-colors">
                  <Mail className="h-3.5 w-3.5" />rentiloilo@example.com
                </a>
              </div>
            </div>

            {/* About / Legal */}
            <div>
              <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-950">About</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-slate-500">About Us</span></li>
                <li><span className="text-slate-500">Privacy Policy</span></li>
                <li><span className="text-slate-500">Terms & Conditions</span></li>
                <li><span className="text-slate-500">Contact Us</span></li>
              </ul>
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2">Coverage Area</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#8B735B]" />
                  <span className="text-xs text-slate-400">La Paz, Iloilo City, Philippines</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <p className="text-xs text-slate-600">© 2026 AptFindr PWA — La Paz, Iloilo City. Academic thesis project.</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-full">
                <Smartphone className="h-3 w-3" /> Progressive Web App
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
