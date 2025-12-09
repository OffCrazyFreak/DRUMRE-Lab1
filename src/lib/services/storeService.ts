import { getDatabase } from "../mongodb";
import { Store } from "@/types/store";
import { ObjectId } from "mongodb";

export interface StoreDocument extends Omit<Store, "lat" | "lon"> {
  _id?: ObjectId;
  lat?: number;
  lon?: number;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "stores";

/**
 * Find a store by chain_code and code
 */
export async function findStoreByCode(
  chain_code: string,
  code: string
): Promise<StoreDocument | null> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  return collection.findOne({ chain_code, code });
}

/**
 * Find all stores for a specific chain
 */
export async function findStoresByChain(
  chain_code: string
): Promise<StoreDocument[]> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  return collection.find({ chain_code }).toArray();
}

/**
 * Create a new store in the database
 */
export async function createStore(store: Store): Promise<StoreDocument> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const now = new Date();
  const storeDocument: StoreDocument = {
    ...store,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(storeDocument);
  return { ...storeDocument, _id: result.insertedId };
}

/**
 * Update an existing store
 */
export async function updateStore(
  chain_code: string,
  code: string,
  updates: Partial<Omit<Store, "chain_code" | "code">>
): Promise<StoreDocument | null> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const result = await collection.findOneAndUpdate(
    { chain_code, code },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Get all geocoded stores (stores with coordinates)
 */
export async function getGeocodedStores(
  chain_code?: string
): Promise<StoreDocument[]> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const query: any = {
    lat: { $exists: true, $ne: null },
    lon: { $exists: true, $ne: null },
  };

  if (chain_code) {
    query.chain_code = chain_code;
  }

  return collection.find(query).toArray();
}

/**
 * Get all stores regardless of geocoding status
 */
export async function getAllStores(
  chain_code?: string
): Promise<StoreDocument[]> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const query: any = {};

  if (chain_code) {
    query.chain_code = chain_code;
  }

  return collection.find(query).toArray();
}

/**
 * Delete all stores for a specific chain
 */
export async function deleteStoresByChain(chain_code: string): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const result = await collection.deleteMany({ chain_code });
  return result.deletedCount;
}

/**
 * Delete a specific store
 */
export async function deleteStore(
  chain_code: string,
  code: string
): Promise<boolean> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const result = await collection.deleteOne({ chain_code, code });
  return result.deletedCount > 0;
}

/**
 * Get stores without coordinates
 */
export async function getStoresWithoutCoordinates(): Promise<StoreDocument[]> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  return collection
    .find({
      $or: [
        { lat: null as any },
        { lon: null as any },
        { lat: { $exists: false } },
        { lon: { $exists: false } },
      ],
    })
    .toArray();
}

/**
 * Bulk update stores with coordinates
 */
export async function bulkUpdateStoreCoordinates(
  stores: Array<{ chain_code: string; code: string; lat: number; lon: number }>
): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  let updatedCount = 0;
  for (const store of stores) {
    const result = await collection.updateOne(
      { chain_code: store.chain_code, code: store.code },
      {
        $set: {
          lat: store.lat,
          lon: store.lon,
          updatedAt: new Date(),
        },
      }
    );
    if (result.modifiedCount > 0) updatedCount++;
  }

  return updatedCount;
}

/**
 * Delete stores by array of identifiers
 */
export async function deleteStoresByIds(
  storeIds: Array<{ chain_code: string; code: string }>
): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const result = await collection.deleteMany({
    $or: storeIds.map((id) => ({
      chain_code: id.chain_code,
      code: id.code,
    })),
  });

  return result.deletedCount;
}

/**
 * Bulk insert stores
 */
export async function bulkCreateStores(stores: Store[]): Promise<number> {
  const db = await getDatabase();
  const collection = db.collection<StoreDocument>(COLLECTION_NAME);

  const now = new Date();
  const storeDocuments: StoreDocument[] = stores.map((store) => ({
    ...store,
    createdAt: now,
    updatedAt: now,
  }));

  const result = await collection.insertMany(storeDocuments);
  return result.insertedCount;
}
