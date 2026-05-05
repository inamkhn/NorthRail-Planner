"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Location } from "@/lib/planner/locations";

export type RouteState = {
  name: string;
  description: string;
  type: string;
  color: string;
  lineStyle: string;
  points: { lat: number; lng: number; label: string; notes?: string; photos?: string[] }[];
};

export type CreateRouteFormProps = {
  location: Location;
  onBack: () => void;
  onSave: (route: RouteState) => void;
  onChange?: (route: RouteState) => void;
  onPickOnMap?: () => void;
  draftLat?: number;
  draftLng?: number;
};

const ROUTE_TYPES = ["HIGH SPEED", "FREIGHT", "COMMUTER", "METRO"] as const;
const COLORS = ["#E91E63", "#2196F3", "#4CAF50", "#FF9800", "#212121", "#9C27B0", "#F44336", "#00BCD4"];
const LINE_STYLES = ["SOLID", "DASHED", "DOTTED", "DASH-DOT"] as const;

// Add Coordinate Point Side Panel Component
function AddPointPanel({
  isOpen,
  onClose,
  onSave,
  onPickOnMap,
  draftLat,
  draftLng,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (point: { lat: number; lng: number; label: string; notes?: string; photos?: string[] }) => void;
  onPickOnMap?: () => void;
  draftLat?: number;
  draftLng?: number;
}) {
  const [label, setLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (draftLat !== undefined && draftLat !== null) setLat(draftLat.toString());
    if (draftLng !== undefined && draftLng !== null) setLng(draftLng.toString());
  }, [draftLat, draftLng]);

  if (!isOpen) return null;

  const handleSave = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (label && !isNaN(latNum) && !isNaN(lngNum)) {
      onSave({ lat: latNum, lng: lngNum, label, notes, photos });
      setLabel("");
      setLat("");
      setLng("");
      setNotes("");
      setPhotos([]);
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("photo", file);
      // We dynamically import to avoid running on client before hydration if not needed,
      // but since it's a server action, it works directly.
      const { uploadRoutePhoto } = await import("@/lib/actions");
      const url = await uploadRoutePhoto(formData);
      setPhotos((prev) => [...prev, url]);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="absolute left-[320px] top-0 z-20 h-full w-[340px] overflow-hidden bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 p-5">
          <h3 className="text-lg font-semibold text-zinc-900">Add Coordinate Point</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="h-[calc(100%-140px)] overflow-y-auto p-5">
        {/* Location Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#db2777]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#db2777]">Location</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">POINT LABEL</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., North Central Hub"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 focus:border-[#db2777] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">LATITUDE</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="41.8781"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 focus:border-[#db2777] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">LONGITUDE</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="-87.6298"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 focus:border-[#db2777] focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onPickOnMap}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#db2777] bg-[#db2777]/5 py-2.5 text-xs font-medium text-[#be185d] hover:bg-[#db2777]/10"
            >
              <Icon name="marker" className="h-4 w-4" />
              Pick Location on Map
            </button>
          </div>
        </div>

        {/* Point Details */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#db2777]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#db2777]">Point Details</span>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the geotechnical observations or site conditions..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 placeholder:text-zinc-400 focus:border-[#db2777] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Site Photos */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#db2777]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#db2777]">Site Photos</span>
          </div>
          
          {photos.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`Photo ${i+1}`} className="h-16 w-16 shrink-0 rounded-lg object-cover border border-zinc-200" />
              ))}
            </div>
          )}

          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 py-4 text-xs font-medium text-zinc-400 hover:border-zinc-300 hover:text-zinc-500">
            <Icon name="plus" className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Add Site Photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        </div>

        {/* Actions - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-3 border-t border-zinc-100 bg-white p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-200"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[#db2777] py-3 text-sm font-semibold text-white hover:bg-[#be185d]"
          >
            Save Point
          </button>
        </div>
    </div>
  );
}

export function CreateRouteForm({
  location,
  onBack,
  onSave,
  onChange,
  onPickOnMap,
  draftLat,
  draftLng,
}: CreateRouteFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("HIGH SPEED");
  const [color, setColor] = useState("#E91E63");
  const [lineStyle, setLineStyle] = useState("SOLID");
  const [points, setPoints] = useState<{ lat: number; lng: number; label: string; notes?: string; photos?: string[] }[]>([]);
  const [showAddPointModal, setShowAddPointModal] = useState(false);

  useEffect(() => {
    onChange?.({ name, description, type, color, lineStyle, points });
  }, [name, description, type, color, lineStyle, points, onChange]);

  const handleSave = () => {
    onSave({ name, description, type, color, lineStyle, points });
  };

  const removePoint = (idx: number) => {
    setPoints((p) => p.filter((_, i) => i !== idx));
  };

  const addPoint = (point: { lat: number; lng: number; label: string; notes?: string; photos?: string[] }) => {
    setPoints((p) => [...p, point]);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <button type="button" onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-700">Locations</button>
        <span className="text-sm text-zinc-400">›</span>
        <span className="text-sm text-zinc-500">{location.name}</span>
        <span className="text-sm text-zinc-400">›</span>
        <span className="text-sm font-semibold text-[#db2777]">New Route</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">Create New Route</h2>
        <p className="mb-5 text-sm text-zinc-500">Configure transit corridor parameters</p>

        {/* Section 01: Route Identity */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">01 Route Identity</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Route Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#db2777] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Description<span className="text-xs text-zinc-400"> (optional)</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#db2777] focus:outline-none resize-none" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-600">Type</label>
              <div className="flex flex-wrap gap-2">
                {ROUTE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-full px-2 py-1 text-[10px] font-normal transition-colors ${
                      type === t ? "bg-[#db2777] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 02: Appearance */}
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">02 Appearance</p>
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-600">Color Palette</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full ring-2 transition-all ${color === c ? "ring-[#db2777] ring-offset-2" : "ring-transparent hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-600">Line Style</label>
              <div className="flex gap-2">
                {LINE_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLineStyle(s)}
                    className={`flex-1 rounded-lg border px-2 py-1 text-[8px] font-medium transition-colors ${
                      lineStyle === s ? "border-[#db2777] bg-[#db2777]/10 text-[#be185d]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 03: Route Points */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">03 Route Points</p>
          <div className="space-y-2">
            {points.map((pt, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">{idx + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-zinc-600">{pt.lat.toFixed(4)}° N, {pt.lng.toFixed(4)}° W</div>
                  <div className="text-xs text-zinc-400">{pt.label}</div>
                </div>
                <button type="button" onClick={() => removePoint(idx)} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"><Icon name="close" className="h-3 w-3" /></button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowAddPointModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-3 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
            >
              <Icon name="plus" className="h-3 w-3" /> ADD COORDINATE POINT
            </button>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-3 border-t border-zinc-200 p-4">
        <button type="button" onClick={onBack} className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">CANCEL</button>
        <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-[#db2777] py-2.5 text-sm font-semibold text-white hover:bg-[#be185d]">SAVE ROUTE</button>
      </div>

      {/* Add Point Side Panel */}
      <AddPointPanel
        isOpen={showAddPointModal}
        onClose={() => setShowAddPointModal(false)}
        onSave={addPoint}
        onPickOnMap={onPickOnMap}
        draftLat={draftLat}
        draftLng={draftLng}
      />
    </div>
  );
}
