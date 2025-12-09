import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Store } from "@/types/store";
import { geocodeAddress } from "@/lib/geocoding";
import {
  findStoreByCode,
  createStore,
  updateStore,
  getAllStores,
  getStoresWithoutCoordinates,
  bulkUpdateStoreCoordinates,
  deleteStoresByIds,
  bulkCreateStores,
  StoreDocument,
} from "@/lib/services/storeService";

/**
 * Fetch all stores from cijene.dev API
 */
async function fetchAllStoresFromAPI(): Promise<Store[]> {
  const apiUrl = process.env.CIJENE_API_URL || "https://api.cijene.dev";
  const apiToken = process.env.CIJENE_API_TOKEN;

  if (!apiToken) {
    throw new Error("API token not configured");
  }

  console.log("Fetching all chains from API...");
  const chainsResponse = await axios.get(`${apiUrl}/v1/chains/`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const chains: string[] = chainsResponse.data.chains || [];
  const allStores: Store[] = [];

  console.log(`Found ${chains.length} chains, fetching stores...`);

  for (const chainCode of chains) {
    try {
      const response = await axios.get(`${apiUrl}/v1/${chainCode}/stores/`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });
      const stores = response.data.stores || [];
      allStores.push(...stores);
      console.log(`Fetched ${stores.length} stores from ${chainCode}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching stores for chain ${chainCode}:`, error);
    }
  }

  console.log(`Total stores fetched from API: ${allStores.length}`);
  return allStores;
}

/**
 * Fetch stores for a specific chain from cijene.dev API
 */
async function fetchChainStoresFromAPI(chainCode: string): Promise<Store[]> {
  const apiUrl = process.env.CIJENE_API_URL || "https://api.cijene.dev";
  const apiToken = process.env.CIJENE_API_TOKEN;

  if (!apiToken) {
    throw new Error("API token not configured");
  }

  console.log(`Fetching stores for chain: ${chainCode}`);
  const response = await axios.get(`${apiUrl}/v1/${chainCode}/stores/`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  return response.data.stores || [];
}

/**
 * Geocode stores without coordinates
 */
async function geocodeStoresWithoutCoordinates(
  stores: StoreDocument[]
): Promise<number> {
  console.log(`Geocoding ${stores.length} stores without coordinates...`);

  const updates: Array<{
    chain_code: string;
    code: string;
    lat: number;
    lon: number;
  }> = [];

  const batchSize = 5;
  for (let i = 0; i < stores.length; i += batchSize) {
    const batch = stores.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (store) => {
        try {
          const coordinates = await geocodeAddress(store.address, store.city);
          if (coordinates) {
            console.log(
              `Geocoded ${store.chain_code} - ${store.code}: ${coordinates.lat}, ${coordinates.lon}`
            );
            return {
              chain_code: store.chain_code,
              code: store.code,
              lat: coordinates.lat,
              lon: coordinates.lon,
            };
          }
        } catch (error) {
          console.error(
            `Failed to geocode ${store.chain_code} - ${store.code}:`,
            error
          );
        }
        return null;
      })
    );

    updates.push(
      ...results.filter((r): r is NonNullable<typeof r> => r !== null)
    );

    // Delay between batches
    if (i + batchSize < stores.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (updates.length > 0) {
    const updatedCount = await bulkUpdateStoreCoordinates(updates);
    console.log(`Successfully geocoded and updated ${updatedCount} stores`);
    return updatedCount;
  }

  return 0;
}

/**
 * Sync stores from API with database
 */
async function syncStoresWithAPI(
  apiStores: Store[]
): Promise<{ added: number; removed: number; updated: number }> {
  console.log("Syncing stores with database...");

  const dbStores = await getAllStores();

  // Create lookup maps
  const apiStoreMap = new Map(
    apiStores.map((s) => [`${s.chain_code}:${s.code}`, s])
  );
  const dbStoreMap = new Map(
    dbStores.map((s) => [`${s.chain_code}:${s.code}`, s])
  );

  // Find stores to add (in API but not in DB)
  const storesToAdd: Store[] = [];
  for (const [key, apiStore] of apiStoreMap) {
    if (!dbStoreMap.has(key)) {
      storesToAdd.push(apiStore);
    }
  }

  // Find stores to remove (in DB but not in API)
  const storesToRemove: Array<{ chain_code: string; code: string }> = [];
  for (const [key, dbStore] of dbStoreMap) {
    if (!apiStoreMap.has(key)) {
      storesToRemove.push({
        chain_code: dbStore.chain_code,
        code: dbStore.code,
      });
    }
  }

  // Find stores to update (address changed)
  const storesToUpdate: Store[] = [];
  for (const [key, apiStore] of apiStoreMap) {
    const dbStore = dbStoreMap.get(key);
    if (dbStore) {
      const addressChanged =
        dbStore.address !== apiStore.address ||
        dbStore.city !== apiStore.city ||
        dbStore.zipcode !== apiStore.zipcode;

      if (addressChanged) {
        storesToUpdate.push(apiStore);
      }
    }
  }

  console.log(`Stores to add: ${storesToAdd.length}`);
  console.log(`Stores to remove: ${storesToRemove.length}`);
  console.log(`Stores to update: ${storesToUpdate.length}`);

  // Remove stores no longer in API
  let removedCount = 0;
  if (storesToRemove.length > 0) {
    removedCount = await deleteStoresByIds(storesToRemove);
    console.log(`Removed ${removedCount} stores`);
  }

  // Add new stores (geocode them first)
  let addedCount = 0;
  if (storesToAdd.length > 0) {
    console.log(`Geocoding ${storesToAdd.length} new stores...`);

    const geocodedStores: Store[] = [];
    const batchSize = 5;

    for (let i = 0; i < storesToAdd.length; i += batchSize) {
      const batch = storesToAdd.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (store) => {
          try {
            const coordinates = await geocodeAddress(store.address, store.city);
            return {
              ...store,
              lat: coordinates?.lat,
              lon: coordinates?.lon,
            };
          } catch (error) {
            console.error(
              `Failed to geocode new store ${store.chain_code} - ${store.code}:`,
              error
            );
            return store;
          }
        })
      );

      geocodedStores.push(...results);

      // Delay between batches
      if (i + batchSize < storesToAdd.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    addedCount = await bulkCreateStores(geocodedStores);
    console.log(`Added ${addedCount} new stores`);
  }

  // Update stores with changed addresses (geocode them)
  let updatedCount = 0;
  if (storesToUpdate.length > 0) {
    console.log(`Re-geocoding ${storesToUpdate.length} updated stores...`);

    for (const store of storesToUpdate) {
      try {
        const coordinates = await geocodeAddress(store.address, store.city);
        await updateStore(store.chain_code, store.code, {
          address: store.address,
          city: store.city,
          zipcode: store.zipcode,
          type: store.type,
          lat: coordinates?.lat,
          lon: coordinates?.lon,
        });
        updatedCount++;

        // Delay between geocoding requests
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(
          `Failed to update store ${store.chain_code} - ${store.code}:`,
          error
        );
      }
    }

    console.log(`Updated ${updatedCount} stores`);
  }

  return { added: addedCount, removed: removedCount, updated: updatedCount };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get("chain") || "all";
    const sync = searchParams.get("sync") === "true"; // Force sync with API

    // Step 1: Get all stores from database
    console.log("Step 1: Fetching all stores from database...");
    const allDbStores =
      chain === "all" ? await getAllStores() : await getAllStores(chain);

    console.log(`Found ${allDbStores.length} stores in database`);

    // Step 2: Geocode stores without coordinates
    console.log("Step 2: Checking for stores without coordinates...");
    const storesWithoutCoords = allDbStores.filter(
      (s) => s.lat == null || s.lon == null
    );

    if (storesWithoutCoords.length > 0) {
      console.log(
        `Found ${storesWithoutCoords.length} stores without coordinates`
      );
      await geocodeStoresWithoutCoordinates(storesWithoutCoords);
    } else {
      console.log("All stores have coordinates");
    }

    // Step 3: Sync with API if requested
    if (sync) {
      console.log("Step 3: Syncing with cijene.dev API...");
      const apiStores =
        chain === "all"
          ? await fetchAllStoresFromAPI()
          : await fetchChainStoresFromAPI(chain);

      const syncStats = await syncStoresWithAPI(apiStores);
      console.log("Sync completed:", syncStats);
    }

    // Step 4: Fetch all stores again and return
    console.log("Step 4: Fetching updated stores from database...");
    const finalStores =
      chain === "all" ? await getAllStores() : await getAllStores(chain);

    console.log(`Returning ${finalStores.length} total stores`);

    const geocodedCount = finalStores.filter(
      (s) => s.lat != null && s.lon != null
    ).length;
    const missingCoordsCount = finalStores.length - geocodedCount;

    return NextResponse.json({
      success: true,
      data: finalStores,
      chain: chain,
      stats: {
        total: finalStores.length,
        geocoded: geocodedCount,
        missingCoordinates: missingCoordsCount,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/stores:", error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.detail || "Failed to fetch stores data",
          status: error.response?.status,
        },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stores data",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get("chain");
    const code = searchParams.get("code");

    const body = await request.json().catch(() => ({}));
    const stores = body.stores as
      | Array<{ chain: string; code: string }>
      | undefined;

    if (stores && stores.length > 0) {
      // Bulk delete
      const { deleteStoresByIds } = await import("@/lib/services/storeService");
      const ids = stores.map((s) => ({ chain_code: s.chain, code: s.code }));
      const deletedCount = await deleteStoresByIds(ids);
      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} stores`,
      });
    }

    if (!chain) {
      return NextResponse.json(
        {
          success: false,
          error: "Chain parameter is required",
        },
        { status: 400 }
      );
    }

    const { deleteStore, deleteStoresByChain } = await import(
      "@/lib/services/storeService"
    );

    if (code) {
      // Delete specific store
      const deleted = await deleteStore(chain, code);
      return NextResponse.json({
        success: true,
        deleted,
        message: deleted ? "Store deleted successfully" : "Store not found",
      });
    } else {
      // Delete all stores for chain
      const deletedCount = await deleteStoresByChain(chain);
      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} stores`,
      });
    }
  } catch (error) {
    console.error("Error deleting stores:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete stores",
      },
      { status: 500 }
    );
  }
}
