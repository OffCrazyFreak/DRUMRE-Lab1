import axios from "axios";

export async function geocodeAddress(
  address: string,
  city: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = `${address}, ${city}, Croatia`;
    const response = await axios.get("https://photon.komoot.io/api/", {
      params: {
        q: query,
        limit: 1,
      },
    });

    if (
      response.data &&
      response.data.features &&
      response.data.features.length > 0
    ) {
      const feature = response.data.features[0];
      return {
        lat: feature.geometry.coordinates[1], // Photon returns [lon, lat]
        lon: feature.geometry.coordinates[0],
      };
    }

    return null;
  } catch (error) {
    console.error(`Error geocoding address: ${address}, ${city}`, error);
    return null;
  }
}

export async function geocodeStores<
  T extends { address: string; city: string }
>(stores: T[]): Promise<(T & { lat?: number; lon?: number })[]> {
  // Geocode all stores in parallel using Promise.all
  const geocodingPromises = stores.map(async (store) => {
    const coordinates = await geocodeAddress(store.address, store.city);
    return {
      ...store,
      lat: coordinates?.lat,
      lon: coordinates?.lon,
    };
  });

  return Promise.all(geocodingPromises);
}

// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Filter stores by distance from center
export function filterStoresByDistance<
  T extends { lat?: number; lon?: number }
>(
  stores: T[],
  centerLat: number,
  centerLon: number,
  maxDistanceKm: number
): T[] {
  return stores.filter((store) => {
    if (!store.lat || !store.lon) return false;
    const distance = calculateDistance(
      centerLat,
      centerLon,
      store.lat,
      store.lon
    );
    return distance <= maxDistanceKm;
  });
}
