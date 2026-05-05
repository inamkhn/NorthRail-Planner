"use client";

import { Icon } from "@/components/ui/Icon";
import type { Location, Route } from "@/lib/planner/locations";
import { STATUS_COLORS } from "@/lib/planner/locations";

export type LocationRoutesPageProps = {
  location: Location;
  onBack: () => void;
  onCreateRoute: () => void;
  onViewRoute: (routeId: string) => void;
  onDeleteRoute: (routeId: string) => void;
};

function RouteListItem({
  route,
  onView,
  onDelete,
}: {
  route: Route;
  onView: () => void;
  onDelete: () => void;
}) {
  const statusColor = STATUS_COLORS[route.status];

  const handleDelete = () => {
    if (window.confirm(`Delete route "${route.name}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 transition-all hover:shadow-md">
      <div
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-zinc-900">{route.name}</h4>
        <p className="text-xs text-zinc-500">
          {route.points} pts · {route.routeType}
        </p>
      </div>
      <button
        type="button"
        onClick={onView}
        title="View on map"
        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
      >
        <Icon name="eye" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        title="Delete route"
        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LocationRoutesPage({
  location,
  onBack,
  onCreateRoute,
  onViewRoute,
  onDeleteRoute,
}: LocationRoutesPageProps) {
  return (
    <div className="flex h-full flex-col bg-zinc-50">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700"
        >
          Locations
        </button>
        <span className="text-sm text-zinc-400">›</span>
        <span className="text-sm font-semibold text-[#db2777]">{location.name}</span>
      </div>

      {/* Routes List */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {location.routes.length === 0 && (
          <p className="text-center text-sm text-zinc-400">No routes yet. Create one below.</p>
        )}
        {location.routes.map((route) => (
          <RouteListItem
            key={route.id}
            route={route}
            onView={() => onViewRoute(route.id)}
            onDelete={() => onDeleteRoute(route.id)}
          />
        ))}
      </div>

      {/* Create New Route Button */}
      <div className="border-t border-zinc-200 bg-white p-4">
        <button
          type="button"
          onClick={onCreateRoute}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#db2777] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#be185d]"
        >
          <Icon name="plus" className="h-4 w-4" />
          Create New Route
        </button>
      </div>
    </div>
  );
}
