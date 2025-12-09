"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import MapComponent from "@/components/MapComponent";
import { geocodeStores, filterStoresByDistance } from "@/lib/geocoding";
import { GeocodedStore } from "@/types/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StoresPage() {
  const [geocodedStores, setGeocodedStores] = useState<GeocodedStore[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([
    14.7978, 45.4039,
  ]); // Delnice
  const [allStores, setAllStores] = useState<any[]>([]);
  const [loadedChains, setLoadedChains] = useState<Set<string>>(new Set());

  // Priority chains to load first (major Croatian chains likely to be nearby)
  const PRIORITY_CHAINS = ["konzum", "lidl", "plodine", "spar", "studenac"];

  // Fetch available chains
  const { data: chainsData, isLoading: isLoadingChains } = useQuery({
    queryKey: ["chains"],
    queryFn: async () => {
      const response = await axios.get("/api/chains");
      return response.data;
    },
  });

  // Progressive loading: fetch priority chains first, then others
  const loadStoresForChain = useCallback(async (chainCode: string) => {
    try {
      const response = await axios.get(`/api/stores?chain=${chainCode}`);
      if (response.data?.data) {
        // Filter only stores from Zagreb
        const zagrebStores = response.data.data.filter((store: any) =>
          store.city.toLowerCase().includes("zagreb")
        );

        // Geocode only Zagreb stores
        const geocoded = await geocodeStores(zagrebStores);

        // Filter out stores that couldn't be geocoded
        const validStores = geocoded.filter(
          (store): store is GeocodedStore =>
            store.lat !== undefined && store.lon !== undefined
        );

        // Add to geocoded stores
        setGeocodedStores((prev) => [...prev, ...validStores]);
        setAllStores((prev) => [...prev, ...zagrebStores]);
        setLoadedChains((prev) => new Set([...prev, chainCode]));
      }
    } catch (error) {
      console.error(`Error loading stores for chain ${chainCode}:`, error);
    }
  }, []);

  // Start progressive loading when chains are loaded
  useEffect(() => {
    if (chainsData?.chains && !isLoadingChains) {
      const startProgressiveLoading = async () => {
        setIsGeocoding(true);

        // Phase 1: Load priority chains first
        for (const chain of PRIORITY_CHAINS) {
          if (chainsData.chains.includes(chain)) {
            await loadStoresForChain(chain);
          }
        }

        // Phase 2: Load remaining chains in background
        const remainingChains = chainsData.chains.filter(
          (chain: string) => !PRIORITY_CHAINS.includes(chain)
        );

        // Load remaining chains asynchronously
        remainingChains.forEach((chain: string) => {
          loadStoresForChain(chain);
        });

        setIsGeocoding(false);
      };

      startProgressiveLoading();
    }
  }, [chainsData, isLoadingChains, loadStoresForChain]);

  // Filter visible stores based on zoom level
  const visibleStores = useMemo(() => {
    if (currentZoom >= 10) {
      return filterStoresByDistance(
        geocodedStores,
        currentCenter[1], // lat
        currentCenter[0], // lon
        10 // 10km radius
      );
    }
    return geocodedStores;
  }, [geocodedStores, currentZoom, currentCenter]);

  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom);
  };

  const handleCenterChange = (center: [number, number]) => {
    setCurrentCenter(center);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Map Status</CardTitle>
              <CardDescription>
                Automatic store loading based on zoom level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-2">
                {isLoadingChains && <p>Loading chains...</p>}
                {chainsData && (
                  <div>
                    <p>Found {chainsData.chains.length} chains</p>
                    <p>
                      Loaded {loadedChains.size} chains with{" "}
                      {geocodedStores.length} geocoded stores
                    </p>
                    <p>Current zoom: {currentZoom.toFixed(1)}</p>
                    <p>
                      Center: {currentCenter[1].toFixed(4)},{" "}
                      {currentCenter[0].toFixed(4)}
                    </p>
                    {currentZoom >= 10 ? (
                      <p className="text-blue-600">
                        📍 Showing stores within 10km radius (
                        {visibleStores.length} visible)
                      </p>
                    ) : (
                      <p className="text-green-600">
                        🌍 Showing all loaded stores ({visibleStores.length}{" "}
                        visible)
                      </p>
                    )}
                  </div>
                )}
                {isGeocoding && (
                  <p className="text-blue-600">
                    Geocoding stores... This may take a moment.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <MapComponent
                stores={visibleStores}
                onZoomChange={handleZoomChange}
                onCenterChange={handleCenterChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
