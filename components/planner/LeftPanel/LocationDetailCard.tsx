"use client";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { Location, LocationType, Route, RouteStatus } from "@/lib/planner/locations";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/planner/locations";

export type LocationDetailCardProps = {
  location: Location;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const typeLabels: Record<LocationType, string> = {
  city: "City",
  region: "Region",
};

function RouteItem({ route }: { route: Route }) {
  const statusColor = STATUS_COLORS[route.status];
  const statusLabel = STATUS_LABELS[route.status];

  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <div>
          <div className="font-medium text-zinc-900">{route.name}</div>
          <div className="text-xs text-zinc-500">
            {route.points} pts · {route.routeType}
          </div>
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          backgroundColor: `${statusColor}20`,
          color: statusColor,
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

export function LocationDetailCard({
  location,
  onClose,
  onEdit,
  onDelete,
}: LocationDetailCardProps) {
  return (
    <Card className="w-[340px] overflow-hidden p-0 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: location.iconColor }}
          >
            <Icon name="building" className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{location.name}</h3>
            <p className="text-sm text-zinc-500 capitalize">{typeLabels[location.type]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {location.tags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded-full bg-[#db2777]/10 px-3 py-1 text-xs font-medium text-[#be185d]"
          >
            {tag.icon === "routes" && <Icon name="route" className="h-3 w-3" />}
            {tag.icon === "speed" && <Icon name="speed" className="h-3 w-3" />}
            {tag.label}
          </span>
        ))}
      </div>

      {/* Notes */}
      <div className="px-5 pb-5">
        <p className="text-sm italic leading-relaxed text-zinc-500">
          &ldquo;{location.notes}&rdquo;
        </p>
      </div>

      {/* Routes Section */}
      <div className="border-t border-zinc-100 px-5 py-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Routes
        </h4>
        <div className="space-y-2">
          {location.routes.map((route) => (
            <RouteItem key={route.id} route={route} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-zinc-100 p-5">
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50"
        >
          <Icon name="trash" className="h-4 w-4" />
          Delete Location
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#db2777] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#be185d]"
        >
          <Icon name="edit" className="h-4 w-4" />
          Edit Location
        </button>
      </div>
    </Card>
  );
}
