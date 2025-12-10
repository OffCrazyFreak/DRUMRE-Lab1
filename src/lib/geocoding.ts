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
