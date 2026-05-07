"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TopBar } from "@/components/planner/TopBar";
import {
  LeftPanel,
  type LeftPanelView,
} from "@/components/planner/LeftPanel/LeftPanel";
import { MapCanvas } from "@/components/planner/MapCanvas/MapCanvas";
import { RightPanel } from "@/components/planner/RightPanel/RightPanel";
import { RouteVariantsPanel } from "@/components/planner/RightPanel/RouteVariantsPanel";
import { MapLegendPanel } from "@/components/planner/RightPanel/MapLegendPanel";
import {
  type Location,
  type LocationType,
  mapDbLocation,
} from "@/lib/planner/locations";
import {
  fetchLocations,
  fetchRoute,
  addLocation as addLocationDb,
  removeLocation as removeLocationDb,
  addRoute as addRouteDb,
  removeRoute as removeRouteDb,
} from "@/lib/actions";
import { DEFAULT_PLANNER_STATE } from "@/lib/planner/state";
import type { RouteVariantDef } from "@/lib/planner/types";
import type { RouteState } from "@/components/planner/LeftPanel/CreateRouteForm";
import { fetchCityBoundary } from "@/lib/maptiler/geocoding";

export function PlannerScreen() {
  // ── Location state ───────────────────────────────────────────────────────
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<LeftPanelView>("list");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Map overlay state ────────────────────────────────────────────────────
  const [resistanceLayerVisibility, setResistanceLayerVisibility] = useState(
    DEFAULT_PLANNER_STATE.resistanceLayerVisibility,
  );
  const [rightPanelTab, setRightPanelTab] = useState<
    "variants" | "legend" | null
  >(null);

  // ── Route state ──────────────────────────────────────────────────────────
  const [draftRoute, setDraftRoute] = useState<RouteState | null>(null);
  const [viewingRoute, setViewingRoute] = useState<RouteVariantDef | null>(
    null,
  );

  // ── City boundary state ──────────────────────────────────────────────────
  const [cityBoundaryGeojson, setCityBoundaryGeojson] =
    useState<GeoJSON.Geometry | null>(null);

  // ── Issue 4: Build DB route variants for RouteVariantsPanel ──────────────
  const dbRouteVariants = useMemo<RouteVariantDef[]>(() => {
    const variants: RouteVariantDef[] = [];
    for (const loc of locations) {
      for (const route of loc.routes) {
        variants.push({
          id: route.id,
          group: "preferred",
          shortLabel: loc.name,
          title: route.name,
          color: route.color,
          lineStyle: route.lineStyle,
          geojson: { type: "FeatureCollection", features: [] },
        });
      }
    }
    return variants;
  }, [locations]);

  // ── Active variant for map rendering ─────────────────────────────────────
  let activeVariantToRender: RouteVariantDef | null = null;

  if (view === "create-route" && draftRoute) {
    const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];
    draftRoute.points.forEach((p, idx) => {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          label: p.label,
          notes: p.notes,
          photos: p.photos ? JSON.stringify(p.photos) : undefined,
          isEndpoint: idx === 0 || idx === draftRoute.points.length - 1,
        },
      });
    });
    if (draftRoute.points.length >= 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: draftRoute.points.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      });
    }
    activeVariantToRender = {
      id: "draft-route",
      group: "preferred",
      shortLabel: "DRAFT",
      title: draftRoute.name || "Draft Route",
      color: draftRoute.color,
      lineStyle: draftRoute.lineStyle,
      geojson: { type: "FeatureCollection", features },
    };
  } else if (viewingRoute) {
    activeVariantToRender = viewingRoute;
  }
  // No active variant → map shows empty (user hasn't started creating or viewing yet)

  // ── Load locations from DB on mount ──────────────────────────────────────
  useEffect(() => {
    fetchLocations()
      .then((dbLocations) => setLocations(dbLocations.map(mapDbLocation)))
      .catch((err) => console.error("Failed to load locations:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Fetch city boundary when a location is selected ──────────────────────
  useEffect(() => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) {
      setCityBoundaryGeojson(null);
      return;
    }
    let cancelled = false;
    fetchCityBoundary(loc.name).then((result) => {
      if (!cancelled) setCityBoundaryGeojson(result?.geojson ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedLocationId, locations]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectLocation = useCallback((id: string) => {
    setSelectedLocationId(id);
  }, []);

  const handleDeleteLocation = useCallback(async (id: string) => {
    try {
      await removeLocationDb(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  }, []);

  const handleAddLocation = useCallback(
    async (data: {
      name: string;
      type: LocationType;
      notes: string;
      lat: number;
      lng: number;
    }) => {
      const dbLocation = await addLocationDb({
        name: data.name,
        type: data.type,
        notes: data.notes,
        lat: data.lat,
        lng: data.lng,
        iconColor: data.type === "city" ? "#3b82f6" : "#22c55e",
        tags: [],
      });
      setLocations((prev) => [
        ...prev,
        mapDbLocation({ ...dbLocation, routes: [] }),
      ]);
      setView("list");
      setMarkerPosition(null);
      setIsPickingLocation(false);
    },
    [],
  );

  const handlePickOnMap = useCallback(() => {
    setIsPickingLocation(true);
  }, []);

  const handleMapPick = useCallback((lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });
    setIsPickingLocation(false);
  }, []);

  const handleSaveRoute = useCallback(
    async (route: {
      name: string;
      description: string;
      type: string;
      color: string;
      lineStyle: string;
      points: {
        lat: number;
        lng: number;
        label: string;
        notes?: string;
        photos?: string[];
      }[];
    }) => {
      if (!selectedLocationId) return;
      try {
        await addRouteDb({
          ...route,
          locationId: selectedLocationId,
          points: route.points.map((p, i) => ({ ...p, order: i })),
        });
        const dbLocations = await fetchLocations();
        setLocations(dbLocations.map(mapDbLocation));
        setDraftRoute(null);
      } catch (err) {
        console.error("Failed to save route:", err);
      }
    },
    [selectedLocationId],
  );

  // ── Issue 2: View saved route on map ─────────────────────────────────────
  const handleViewRoute = useCallback(async (routeId: string) => {
    try {
      const dbRoute = await fetchRoute(routeId);
      if (!dbRoute) return;

      const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];
      for (let i = 0; i < dbRoute.points.length; i++) {
        const p = dbRoute.points[i];
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: {
            label: p.label,
            notes: p.notes,
            photos: p.photos ? JSON.stringify(p.photos) : undefined,
            isEndpoint: i === 0 || i === dbRoute.points.length - 1,
          },
        });
      }

      if (dbRoute.points.length >= 2) {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: dbRoute.points.map((p: { lng: number; lat: number }) => [p.lng, p.lat]),
          },
          properties: {},
        });
      }

      setViewingRoute({
        id: routeId,
        group: "preferred",
        shortLabel: dbRoute.name,
        title: dbRoute.name,
        color: dbRoute.color,
        lineStyle: dbRoute.lineStyle,
        geojson: { type: "FeatureCollection", features },
      });
    } catch (err) {
      console.error("Failed to load route for map:", err);
    }
  }, []);

  // ── Issue 1: Delete route ─────────────────────────────────────────────────
  const handleDeleteRoute = useCallback(
    async (routeId: string) => {
      try {
        await removeRouteDb(routeId);
        if (viewingRoute?.id === routeId) setViewingRoute(null);
        const dbLocations = await fetchLocations();
        setLocations(dbLocations.map(mapDbLocation));
      } catch (err) {
        console.error("Failed to delete route:", err);
      }
    },
    [viewingRoute],
  );

  // ── Right-panel toggles ───────────────────────────────────────────────────
  const handleToggleVariants = useCallback(() => {
    setRightPanelTab((prev) => (prev === "variants" ? null : "variants"));
  }, []);

  const handleToggleLegend = useCallback(() => {
    setRightPanelTab((prev) => (prev === "legend" ? null : "legend"));
  }, []);

  const handleToggleResistanceLayer = useCallback((id: string) => {
    setResistanceLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  void isLoading; // consumed by loading state (future spinner)

  return (
    <div className="flex h-[100svh] w-full flex-col bg-white">
      <TopBar />
      <div className="flex flex-col-reverse sm:flex-row flex-1 overflow-hidden">
        <div className="flex h-1/2 w-full shrink-0 flex-col sm:h-auto sm:w-[320px]">
          <LeftPanel
          view={view}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onChangeView={setView}
          onSelectLocation={handleSelectLocation}
          onAddLocation={handleAddLocation}
          onDeleteLocation={handleDeleteLocation}
          onPickOnMap={handlePickOnMap}
          onSaveRoute={handleSaveRoute}
          onViewRoute={handleViewRoute}
          onDeleteRoute={handleDeleteRoute}
          onChangeDraftRoute={setDraftRoute}
          draftLat={markerPosition?.lat}
          draftLng={markerPosition?.lng}
        />
        </div>

        {/* Map area */}
        <div className="relative h-1/2 min-w-0 flex-1 sm:h-auto">
          <MapCanvas
            isPickingLocation={isPickingLocation}
            onPickLocation={handleMapPick}
            markerPosition={markerPosition}
            activeVariant={activeVariantToRender}
            resistanceVisibility={resistanceLayerVisibility}
            resistanceLayers={[]}
            cityBoundaryGeojson={cityBoundaryGeojson}
          />

          <RightPanel
            activeTab={rightPanelTab ?? undefined}
            onToggleVariants={handleToggleVariants}
            onToggleLegend={handleToggleLegend}
          />

          {rightPanelTab && (
            <div className="pointer-events-none absolute right-2 top-12 sm:right-5 sm:top-16 z-20 flex flex-col items-end">
              {rightPanelTab === "variants" && (
                <RouteVariantsPanel
                  variants={dbRouteVariants}
                  selectedVariantId={viewingRoute?.id ?? null}
                  onSelectVariant={handleViewRoute}
                />
              )}
              {/* {rightPanelTab === "legend" && (
                <MapLegendPanel
                  visibility={resistanceLayerVisibility}
                  onToggleLayer={handleToggleResistanceLayer}
                />
              )} */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
