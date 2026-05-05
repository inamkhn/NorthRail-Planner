"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  config,
  Map as MapTilerMap,
  MapStyle,
  Marker,
  Popup,
} from "@maptiler/sdk";
import { MapControls } from "./MapControls";
import { PointPopup } from "./PointPopup";
import type {
  RouteVariantDef,
  ResistanceLayerDef,
} from "@/lib/planner/types";
import {
  addOrUpdateRouteLayer,
  addOrUpdateResistanceLayers,
  applyResistanceVisibility,
  removePlannerLayers,
  fitToRoute,
  addCityBoundaryLayer,
  removeCityBoundaryLayer,
  fitToBoundary,
} from "@/lib/maptiler/layers";

export type MapCanvasProps = {
  isPickingLocation?: boolean;
  onPickLocation?: (lat: number, lng: number) => void;
  markerPosition?: { lat: number; lng: number } | null;
  onMarkerPositionChange?: (pos: { lat: number; lng: number } | null) => void;
  activeVariant?: RouteVariantDef | null;
  resistanceVisibility?: Record<string, boolean>;
  resistanceLayers?: ResistanceLayerDef[];
  cityBoundaryGeojson?: GeoJSON.Geometry | null;
};

type BaseStyle = "streets" | "satellite";

const API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";

export function MapCanvas({
  isPickingLocation,
  onPickLocation,
  markerPosition,
  onMarkerPositionChange,
  activeVariant,
  resistanceVisibility,
  resistanceLayers,
  cityBoundaryGeojson,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapTilerMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);

  const [baseStyle, setBaseStyle] = useState<BaseStyle>("streets");
  const style =
    baseStyle === "satellite" ? MapStyle.SATELLITE : MapStyle.STREETS;

  // ── Refs for latest prop values (read inside stable callbacks) ──────────
  const isPickingRef = useRef(isPickingLocation ?? false);
  const onPickLocationRef = useRef(onPickLocation);
  const activeVariantRef = useRef(activeVariant);
  const resistanceVisibilityRef = useRef(resistanceVisibility);
  const resistanceLayersRef = useRef(resistanceLayers);

  // Keep refs in sync with props on every render
  isPickingRef.current = isPickingLocation ?? false;
  onPickLocationRef.current = onPickLocation;
  activeVariantRef.current = activeVariant;
  resistanceVisibilityRef.current = resistanceVisibility;
  resistanceLayersRef.current = resistanceLayers;

  // ── Stable helper: (re-)apply all GeoJSON layers ────────────────────────
  const applyLayers = useCallback((map: MapTilerMap) => {
    removePlannerLayers(map);
    const variant = activeVariantRef.current;
    const layers = resistanceLayersRef.current ?? [];
    const visibility = resistanceVisibilityRef.current ?? {};
    if (variant) {
      addOrUpdateRouteLayer(map, variant);
      // Auto-pan to show the route
      fitToRoute(map, variant.geojson);
    }
    if (layers.length > 0) {
      addOrUpdateResistanceLayers(map, layers);
      applyResistanceVisibility(map, visibility);
    }
  }, []);

  // Set API key once
  useEffect(() => {
    if (API_KEY) config.apiKey = API_KEY;
  }, []);

  // ── Initialize map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapTilerMap({
      container: containerRef.current,
      style,
      center: [10.2, 52.75],
      zoom: 7.5,
      hash: false,
    });

    mapRef.current = map;

    // Apply layers once the initial style has loaded
    map.on("load", () => applyLayers(map));

    // Fix stale closure: read latest values from refs inside this stable handler
    map.on("click", (e) => {
      if (isPickingRef.current && onPickLocationRef.current) {
        const { lat, lng } = e.lngLat;
        onPickLocationRef.current(lat, lng);
      }
    });

    // Point layer interactivity
    const POINTS_LAYER_ID = "planner-route-layer-points";

    map.on("mouseenter", POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", POINTS_LAYER_ID, (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const props = feature.properties as any;

      if (popupRef.current) {
        popupRef.current.remove();
      }

      const popupNode = document.createElement("div");
      const root = createRoot(popupNode);
      root.render(
        <PointPopup
          label={props.label}
          notes={props.notes}
          photos={props.photos ? JSON.parse(props.photos) : undefined}
        />,
      );

      // We use MapTiler's popup but remove its default styling via CSS if needed
      popupRef.current = new Popup({
        offset: 15,
        closeButton: false,
        closeOnClick: true,
        className: "custom-point-popup",
      })
        .setLngLat([coords[0], coords[1]])
        .setDOMContent(popupNode)
        .addTo(map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Style toggle — re-apply layers after new style loads ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Register one-time listener before setStyle so layers are restored
    map.once("style.load", () => applyLayers(map));
    map.setStyle(style);
  }, [style, applyLayers]);

  // ── Re-apply layers when variant / visibility props change ───────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((map as any).isStyleLoaded?.()) {
      applyLayers(map);
    } else {
      // Queue: apply once the style finishes loading
      map.once("style.load", () => applyLayers(map));
    }
  }, [activeVariant, resistanceVisibility, resistanceLayers, applyLayers]);

  // ── City boundary layer ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (cityBoundaryGeojson) {
        addCityBoundaryLayer(map, cityBoundaryGeojson);
        fitToBoundary(map, cityBoundaryGeojson);
      } else {
        removeCityBoundaryLayer(map);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((map as any).isStyleLoaded?.()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
  }, [cityBoundaryGeojson]);

  // ── Marker ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerPosition) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new Marker({ color: "#3b82f6" })
        .setLngLat([markerPosition.lng, markerPosition.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([markerPosition.lng, markerPosition.lat]);
    }
  }, [markerPosition]);

  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);
  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);
  const toggleSatellite = useCallback(() => {
    setBaseStyle((s) => (s === "streets" ? "satellite" : "streets"));
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        isSatellite={baseStyle === "satellite"}
        onToggleSatellite={toggleSatellite}
      />
      {isPickingLocation && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
          <div className="rounded-full bg-zinc-900/80 px-4 py-2 text-sm font-medium text-white">
            Click on the map to set location
          </div>
        </div>
      )}
      {markerPosition && (
        <div className="pointer-events-none absolute bottom-5 left-5 z-10">
          <div className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
            {markerPosition.lat.toFixed(4)}° N, {markerPosition.lng.toFixed(4)}°
            E
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
