"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  SignInButton,
  UserButton,
  useUser,
  useAuth,
} from "@clerk/nextjs";
import Link from "next/link";

interface PublicTopBarProps {
  locations: { id: string; name: string }[];
  selectedLocationId: string | null;
  onSelectLocation: (id: string) => void;
}

const ROUTE_FILTERS = ["All", "HIGH SPEED", "FREIGHT", "COMMUTER", "METRO"] as const;

function AuthSection() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = user?.publicMetadata?.role;

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {role === "ADMIN" && (
        <Link
          href="/admin"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Admin
        </Link>
      )}
      <UserButton />
    </div>
  );
}

function LocationDropdown({
  locations,
  selectedLocationId,
  onSelectLocation,
}: {
  locations: { id: string; name: string }[];
  selectedLocationId: string | null;
  onSelectLocation: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = locations.find((l) => l.id === selectedLocationId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        <Icon name="marker" className="h-3.5 w-3.5 text-zinc-400" />
        <span className="max-w-[120px] truncate">
          {selected ? selected.name : "All Locations"}
        </span>
        <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-zinc-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          <button
            onClick={() => {
              onSelectLocation("");
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !selectedLocationId
                ? "bg-[#db2777]/10 font-medium text-[#be185d]"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            All Locations
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                onSelectLocation(loc.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedLocationId === loc.id
                  ? "bg-[#db2777]/10 font-medium text-[#be185d]"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#db2777]" />
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicTopBar({
  locations,
  selectedLocationId,
  onSelectLocation,
}: PublicTopBarProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-6">
      {/* Left side: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#db2777]">
          <Icon name="route" className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          NorthRail Planner
        </h1>
      </div>

      {/* Right side: Tools, Filters & Auth */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#db2777] transition-colors hover:bg-pink-50"
        >
          <Icon name="reset" className="h-4 w-4" />
          Reset View
        </button>

        <div className="h-6 w-px bg-zinc-200" />

        {/* Route Type Pills */}
        <div className="flex items-center gap-1.5">
          {ROUTE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                activeFilter === f
                  ? "bg-[#db2777] text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-zinc-200" />

        {/* Location Dropdown */}
        <LocationDropdown
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={onSelectLocation}
        />

        <div className="h-6 w-px bg-zinc-200" />

        {/* Auth */}
        <AuthSection />
      </div>
    </header>
  );
}
