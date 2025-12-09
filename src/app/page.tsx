"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Map from "@/components/Map";
import { GeocodedStore } from "@/types/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";

export default function StoresPage() {
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([
    14.7978, 45.4039,
  ]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedChains, setSelectedChains] = useState<string[] | null>(null);

  // Read saved selected chains from localStorage on client mount only
  useEffect(() => {
    try {
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem("selectedStoreChains")
          : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedChains(parsed);
        }
      }
    } catch (error) {
      console.error("Error reading saved chains from localStorage:", error);
    }
  }, []);

  // Save selected chains to localStorage when they change
  useEffect(() => {
    if (selectedChains !== null) {
      localStorage.setItem(
        "selectedStoreChains",
        JSON.stringify(selectedChains)
      );
    }
  }, [selectedChains]);

  // Fetch all stores from database
  const {
    data: storesResponse,
    isLoading: isLoadingStores,
    refetch,
  } = useQuery({
    queryKey: ["all-stores"],
    queryFn: async () => {
      const response = await axios.get("/api/stores?chain=all");
      return response.data;
    },
  });

  const handleSyncWithAPI = async () => {
    setIsSyncing(true);
    try {
      await axios.get("/api/stores?chain=all&sync=true");
      await refetch();
    } catch (error) {
      console.error("Error syncing stores:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom);
  };

  const handleCenterChange = (center: [number, number]) => {
    setCurrentCenter(center);
  };

  const stores = storesResponse?.data || [];
  const stats = storesResponse?.stats || {
    total: 0,
    geocoded: 0,
    missingCoordinates: 0,
  };

  // Get unique chain codes
  const uniqueChains = Array.from(
    new Set(stores.map((store: any) => store.chain_code).filter(Boolean))
  ).sort() as string[];

  // Set default selection to all chains when data loads and no selection exists
  useEffect(() => {
    if (uniqueChains.length > 0 && selectedChains === null) {
      setSelectedChains(uniqueChains);
    }
  }, [uniqueChains, selectedChains]);

  // Filter stores with valid coordinates for map display
  const allVisibleStores: GeocodedStore[] = stores.filter(
    (store: any): store is GeocodedStore =>
      store.lat != null && store.lon != null
  );

  // Filter stores based on selected chains
  const visibleStores: GeocodedStore[] =
    !selectedChains || selectedChains.length === 0
      ? allVisibleStores
      : allVisibleStores.filter((store) =>
          selectedChains.includes(store.chain_code)
        );

  return (
    <div className="">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Status and Map */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Store Map</CardTitle>
                  <CardDescription>
                    All stores from database with coordinates
                  </CardDescription>
                </div>

                <div className="flex items-center flex-wrap gap-4">
                  {/* Store Chain Filter */}
                  {!isLoadingStores && uniqueChains.length > 0 && (
                    <div className="w-auto">
                      <MultiSelect
                        values={selectedChains || []}
                        onValuesChange={setSelectedChains}
                      >
                        <MultiSelectTrigger className="w-full sm:w-auto max-w-xs sm:max-w-md">
                          <MultiSelectValue placeholder="Select store chains to display..." />
                        </MultiSelectTrigger>
                        <MultiSelectContent>
                          {uniqueChains.map((chain) => (
                            <MultiSelectItem key={chain} value={chain}>
                              {chain.toUpperCase()}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectContent>
                      </MultiSelect>
                    </div>
                  )}
                  <Button
                    onClick={handleSyncWithAPI}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {isSyncing
                      ? "Syncing with API..."
                      : "Sync with cijene.dev API"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 space-y-2">
                  {isLoadingStores && <p>Loading stores...</p>}
                  {!isLoadingStores && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold">Database Stats:</p>
                        <p>Total stores: {stats.total}</p>
                        <p>Geocoded: {stats.geocoded}</p>
                        <p>Missing coordinates: {stats.missingCoordinates}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Map View:</p>
                        <p>Visible stores: {visibleStores.length}</p>
                        <p>Current zoom: {currentZoom.toFixed(1)}</p>
                        <p>
                          Center: {currentCenter[1].toFixed(4)},{" "}
                          {currentCenter[0].toFixed(4)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Map
                    stores={visibleStores}
                    onZoomChange={handleZoomChange}
                    onCenterChange={handleCenterChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
