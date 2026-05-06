"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map as MapTilerMap, MapStyle, config, Popup } from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { fetchCityBoundary } from "@/lib/maptiler/geocoding";
import { fitToBoundary } from "@/lib/maptiler/layers";
import { fetchLocations } from "@/lib/actions";
import { PublicPointPopup } from "./PublicPointPopup";
import { createRoot } from "react-dom/client";

const API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";

type LocationWithRoutes = Awaited<ReturnType<typeof fetchLocations>>[number];

interface PublicMapCanvasProps {
  locations: LocationWithRoutes[];
  selectedLocationId: string | null;
}

export function PublicMapCanvas({
  locations,
  selectedLocationId,
}: PublicMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapTilerMap | null>(null);
  const [baseStyle, setBaseStyle] = useState<"streets" | "satellite">(
    "streets",
  );
  const [mapReady, setMapReady] = useState(false);
  const popupRef = useRef<Popup | null>(null);

  // Set API key once
  useEffect(() => {
    if (API_KEY) config.apiKey = API_KEY;
  }, []);

  const clearRoutes = useCallback((map: MapTilerMap) => {
    // We prefix all our dynamic public route sources with "public-route-"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapAny = map as any;
    const style = map.getStyle();
    if (!style) return;

    // Remove layers
    style.layers.forEach((layer) => {
      if (layer.id.startsWith("public-route-")) {
        mapAny.removeLayer(layer.id);
      }
    });
    // Remove sources
    Object.keys(style.sources).forEach((sourceId) => {
      if (sourceId.startsWith("public-route-")) {
        mapAny.removeSource(sourceId);
      }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapTilerMap({
      container: containerRef.current,
      style: baseStyle === "satellite" ? MapStyle.SATELLITE : MapStyle.STREETS,
      center: [10.2, 52.75],
      zoom: 7.5,
      hash: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
    });

    // Handle clicks for popups (route points + location markers)
    map.on("click", (e) => {
      const clickableLayers = map
        .getStyle()
        .layers.filter(
          (l) => l.id.endsWith("-points") || l.id.endsWith("-circles"),
        )
        .map((l) => l.id);
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers,
      });
      if (!features.length) return;
      const feature = features[0];
      const props = feature.properties;
      if (!props) return;

      const coordinates = (feature.geometry as any).coordinates.slice();

      const popupNode = document.createElement("div");
      if (props.type === "location") {
        createRoot(popupNode).render(
          <PublicPointPopup
            label={props.name}
            notes="Location"
            photos={[]}
            onClose={() => popupRef.current?.remove()}
          />,
        );
      } else {
        createRoot(popupNode).render(
          <PublicPointPopup
            label={props.label}
            notes={props.notes}
            photos={props.photos ? JSON.parse(props.photos) : []}
            onClose={() => popupRef.current?.remove()}
          />,
        );
      }

      if (popupRef.current) popupRef.current.remove();

      popupRef.current = new Popup({
        closeButton: false,
        closeOnClick: true,
        maxWidth: "350px",
      })
        .setLngLat(coordinates)
        .setDOMContent(popupNode)
        .addTo(map);
    });

    // Cursor styling via generic map mousemove (dynamic layer IDs)
    const handleMouseMove = (e: any) => {
      const clickableLayers = map
        .getStyle()
        .layers.filter(
          (l) => l.id.endsWith("-points") || l.id.endsWith("-circles"),
        )
        .map((l) => l.id);
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers,
      });
      map.getCanvas().style.cursor = features.length ? "pointer" : "";
    };
    map.on("mousemove", handleMouseMove);

    return () => {
      map.off("mousemove", handleMouseMove);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [baseStyle]);

  // Handle drawing all routes and zooming to selected location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapAny = map as any;

    async function loadData() {
      if (!map) return;

      // 1. Draw all routes from all locations
      clearRoutes(map);

      // ── Location markers (visible even when a location has no routes) ──
      const locSourceId = "public-locations";
      const locFeatures = locations.map((loc) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [loc.lng, loc.lat] },
        properties: {
          id: loc.id,
          name: loc.name,
          type: "location",
          iconColor: loc.iconColor || "#3b82f6",
        },
      }));
      if (mapAny.getSource(locSourceId)) {
        mapAny.getSource(locSourceId).setData({
          type: "FeatureCollection",
          features: locFeatures,
        });
      } else {
        mapAny.addSource(locSourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: locFeatures },
        });
        mapAny.addLayer({
          id: `${locSourceId}-circles`,
          type: "circle",
          source: locSourceId,
          filter: ["==", "type", "location"],
          paint: {
            "circle-color": ["get", "iconColor"],
            "circle-radius": 10,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });
        mapAny.addLayer({
          id: `${locSourceId}-labels`,
          type: "symbol",
          source: locSourceId,
          filter: ["==", "type", "location"],
          layout: {
            "text-field": ["get", "name"],
            "text-size": 13,
            "text-anchor": "top",
            "text-offset": [0, 1.2],
            "text-font": ["Noto Sans Regular"],
          },
          paint: {
            "text-color": "#111111",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          },
        });
      }

      for (const loc of locations) {
        for (const route of loc.routes) {
          const sourceId = `public-route-${route.id}`;

          const features: any[] = [];

          if (route.points.length > 1) {
            features.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: route.points
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((p: any) => [p.lng, p.lat]),
              },
              properties: { id: route.id, type: "line" },
            });
          }

          for (const p of route.points) {
            features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [p.lng, p.lat] },
              properties: {
                id: p.id,
                label: p.label,
                notes: p.notes,
                photos: JSON.stringify(p.photos || []),
                type: "point",
              },
            });
          }

          const geojson = { type: "FeatureCollection", features };

          mapAny.addSource(sourceId, { type: "geojson", data: geojson });

          mapAny.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            filter: ["==", "type", "line"],
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": route.color || "#0284c7", "line-width": 4 },
          });

          mapAny.addLayer({
            id: `${sourceId}-points`,
            type: "circle",
            source: sourceId,
            filter: ["==", "type", "point"],
            paint: {
              "circle-color": "#ffffff",
              "circle-radius": 8,
              "circle-stroke-width": 3,
              "circle-stroke-color": route.color || "#0284c7",
            },
          });

          mapAny.addLayer({
            id: `${sourceId}-labels`,
            type: "symbol",
            source: sourceId,
            filter: ["==", "type", "point"],
            layout: {
              "text-field": ["get", "label"],
              "text-size": 12,
              "text-anchor": "left",
              "text-offset": [0.8, 0],
              "text-font": ["Noto Sans Regular"],
            },
            paint: {
              "text-color": "#111111",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
            },
          });
        }
      }

      // 2. Fetch and zoom to boundary if a location is selected
      const sourceId = "public-city-boundary";
      if (selectedLocationId) {
        const selectedLoc = locations.find((l) => l.id === selectedLocationId);
        if (selectedLoc) {
          const boundary = await fetchCityBoundary(selectedLoc.name);
          if (boundary && boundary.geojson && map) {
            if (!mapAny.getSource(sourceId)) {
              mapAny.addSource(sourceId, {
                type: "geojson",
                data: boundary.geojson,
              });
              mapAny.addLayer({
                id: sourceId + "-fill",
                type: "fill",
                source: sourceId,
                paint: { "fill-color": "#3b82f6", "fill-opacity": 0.05 },
              });
              mapAny.addLayer({
                id: sourceId + "-line",
                type: "line",
                source: sourceId,
                paint: {
                  "line-color": "#3b82f6",
                  "line-width": 2,
                  "line-opacity": 0.5,
                },
              });
            } else {
              mapAny.getSource(sourceId).setData(boundary.geojson);
            }
            fitToBoundary(map, boundary.geojson);
          }
        }
      } else {
        // Remove boundary if "All Locations" is selected
        if (mapAny.getSource(sourceId)) {
          if (mapAny.getLayer(sourceId + "-fill"))
            mapAny.removeLayer(sourceId + "-fill");
          if (mapAny.getLayer(sourceId + "-line"))
            mapAny.removeLayer(sourceId + "-line");
          mapAny.removeSource(sourceId);
        }

        // If "All Locations" is selected, we could fly to a global view
        map.flyTo({ center: [10.2, 52.75], zoom: 5 });
      }
    }

    loadData();
  }, [locations, selectedLocationId, clearRoutes, mapReady]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Map Controls */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6 flex gap-2 shadow-sm">
        <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="flex h-10 w-10 items-center justify-center border-b border-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="flex h-10 w-10 items-center justify-center text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            -
          </button>
        </div>

        <button
          onClick={() =>
            setBaseStyle((s) => (s === "streets" ? "satellite" : "streets"))
          }
          className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 font-medium text-zinc-700 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-zinc-50"
        >
          {baseStyle === "streets" ? "Satellite" : "Streets"}
        </button>
      </div>
    </div>
  );
}
