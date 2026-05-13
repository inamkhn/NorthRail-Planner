"use server";

import { auth } from "@clerk/nextjs/server";

import {
  prisma,
  getLocationsWithRoutes,
  getLocationWithRoutes,
  getRoutesByLocationId,
  getRouteWithPoints,
  createLocation,
  createRoute,
  deleteLocation,
  deleteRoute,
  updateLocation,
  updateRoute,
  createRoutePoint,
  deleteRoutePoint,
  updateRoutePoint as updateRoutePointDb,
} from "./prisma";

export async function fetchLocations() {
  return getLocationsWithRoutes();
}

export async function fetchLocation(id: string) {
  return getLocationWithRoutes(id);
}

export async function fetchRoute(id: string) {
  return getRouteWithPoints(id);
}

export async function fetchLocationRoutes(locationId: string) {
  return getRoutesByLocationId(locationId);
}

// async function requireAdmin() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");
  
//   const user = await prisma.user.findUnique({ where: { clerkId: userId } });
//   if (user?.role !== "ADMIN") {
//     throw new Error("Forbidden: Admin access required.");
//   }
// }

export async function addLocation(data: {
  name: string;
  notes?: string;
  type: string;
  lat: number;
  lng: number;
  iconColor?: string;
  address?: string;
  tags?: string[];
}) {
  // await requireAdmin();
  return createLocation(data);
}

export async function removeLocation(id: string) {
  // await requireAdmin();
  return deleteLocation(id);
}

export async function editLocation(
  id: string,
  data: Partial<{
    name: string;
    notes: string;
    type: string;
    lat: number;
    lng: number;
    iconColor: string;
    address: string;
    tags: string[];
  }>,
) {
  // await requireAdmin();
  return updateLocation(id, data);
}

export async function addRoute(data: {
  name: string;
  description?: string;
  type: string;
  color: string;
  lineStyle: string;
  locationId: string;
  points: Array<{ label: string; lat: number; lng: number; notes?: string; photos?: string[]; order: number; type?: "single" | "bulk" }>;
}) {
  // await requireAdmin();
  return createRoute(data);
}

export async function removeRoute(id: string) {
  // await requireAdmin();

  // ── S3 Cleanup: collect all photo URLs from this route's points ───────────
  try {
    const { getRouteWithPoints } = await import("@/lib/prisma");
    const route = await getRouteWithPoints(id);
    if (route?.points) {
      const allPhotoUrls: string[] = route.points.flatMap(
        (p: { photos: string[] }) => p.photos ?? []
      );
      if (allPhotoUrls.length > 0) {
        const { deleteFileFromS3 } = await import("@/lib/s3");
        await Promise.allSettled(allPhotoUrls.map((url) => deleteFileFromS3(url)));
        console.log(`[S3] Cleaned up ${allPhotoUrls.length} photo(s) for route ${id}`);
      }
    }
  } catch (err) {
    // Do not block the delete if S3 cleanup fails
    console.error("[S3] Photo cleanup failed for route:", id, err);
  }

  return deleteRoute(id);
}

export async function editRoute(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    type: string;
    color: string;
    lineStyle: string;
  }>,
) {
  // await requireAdmin();
  return updateRoute(id, data);
}

export async function editFullRoute(id: string, data: {
  name: string;
  description?: string;
  type: string;
  color: string;
  lineStyle: string;
  points: Array<{ label: string; lat: number; lng: number; notes?: string; photos?: string[]; order: number; type?: "single" | "bulk" }>;
}) {
  const { updateFullRoute } = await import("@/lib/prisma");
  return updateFullRoute(id, data);
}

export async function addRoutePoint(data: {
  label: string;
  lat: number;
  lng: number;
  notes?: string;
  photos?: string[];
  order: number;
  routeId: string;
  type?: "single" | "bulk";
}) {
  // await requireAdmin();
  return createRoutePoint(data);
}

export async function removeRoutePoint(id: string) {
  // await requireAdmin();
  return deleteRoutePoint(id);
}

export async function editRoutePoint(
  id: string,
  data: Partial<{
    label: string;
    lat: number;
    lng: number;
    notes: string;
    photos: string[];
    order: number;
  }>,
) {
  // await requireAdmin();
  return updateRoutePointDb(id, data);
}

export async function updateRoutePoint(id: string, data: Partial<{ label: string; lat: number; lng: number; notes: string; order: number }>) {
  // await requireAdmin();
  return updateRoutePointDb(id, data);
}

export async function deleteRoutePhoto(photoUrl: string) {
  // await requireAdmin();
  if (!photoUrl) return;
  const { deleteFileFromS3 } = await import("@/lib/s3");
  await deleteFileFromS3(photoUrl);
}

export async function uploadRoutePhoto(formData: FormData) {
  // await requireAdmin();
  const file = formData.get("photo") as File | null;
  if (!file) throw new Error("No file uploaded.");

  // ── Edge Case 2: File size guard (10 MB max) ─────────────────────────────
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large. Maximum allowed size is 10 MB.");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // ── Image Optimization via Sharp ──────────────────────────────────────────
  // Edge Case 1: Sharp will throw if the file is not a valid image format.
  let optimizedBuffer: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    optimizedBuffer = await sharp(inputBuffer)
      .resize({ width: 1200, withoutEnlargement: true }) // max 1200px wide
      .webp({ quality: 80 })                             // convert to WebP, 80% quality
      .toBuffer();
  } catch {
    throw new Error("Invalid image format. Please upload a valid image (JPEG, PNG, WEBP, etc.).");
  }

  // ── Edge Case 4: Unique key using crypto to avoid collisions ─────────────
  const { randomUUID } = await import("crypto");
  const key = `site-photos/${Date.now()}-${randomUUID()}.webp`;

  // ── Upload to Hetzner S3 ─────────────────────────────────────────────────
  // Edge Case 3: Wrap in try/catch to handle S3 connectivity issues.
  try {
    const { uploadBufferToS3 } = await import("@/lib/s3");
    const publicUrl = await uploadBufferToS3(optimizedBuffer, key, "image/webp");
    return publicUrl;
  } catch (err) {
    console.error("[S3 Upload Error]", err);
    throw new Error("Failed to upload to cloud storage. Please try again.");
  }
}
