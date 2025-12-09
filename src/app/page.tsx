"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import MapComponent from "@/components/MapComponent";
import LeafletMapComponent from "@/components/LeafletMapComponent";
import { GeocodedStore } from "@/types/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StoresPage() {
  const [currentZoom, setCurrentZoom] = useState<number>(6);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([
    14.7978, 45.4039,
  ]);
  const [leafletZoom, setLeafletZoom] = useState<number>(6);
  const [leafletCenter, setLeafletCenter] = useState<[number, number]>([
    14.7978, 45.4039,
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleLeafletZoomChange = (zoom: number) => {
    setLeafletZoom(zoom);
  };

  const handleLeafletCenterChange = (center: [number, number]) => {
    setLeafletCenter(center);
  };

  const stores = storesResponse?.data || [];
  const stats = storesResponse?.stats || {
    total: 0,
    geocoded: 0,
    missingCoordinates: 0,
  };

  // Filter stores with valid coordinates for map display
  const visibleStores: GeocodedStore[] = stores.filter(
    (store: any): store is GeocodedStore =>
      store.lat != null && store.lon != null
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Store Map</CardTitle>
              <CardDescription>
                All stores from database with coordinates
              </CardDescription>
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
                <Button
                  onClick={handleSyncWithAPI}
                  disabled={isSyncing}
                  variant="outline"
                >
                  {isSyncing
                    ? "Syncing with API..."
                    : "Sync with cijene.dev API"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MapLibre Map */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>MapLibre GL Map</CardTitle>
              <CardDescription>
                Interactive map using MapLibre GL (Vector tiles)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <MapComponent
                stores={visibleStores}
                onZoomChange={handleZoomChange}
                onCenterChange={handleCenterChange}
              />
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-semibold">Current View:</p>
                <p>Zoom: {currentZoom.toFixed(1)}</p>
                <p>
                  Center: {currentCenter[1].toFixed(4)},{" "}
                  {currentCenter[0].toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Leaflet Map */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Leaflet Map</CardTitle>
              <CardDescription>
                Interactive map using Leaflet (Raster tiles) - Performance
                comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <LeafletMapComponent
                stores={visibleStores}
                onZoomChange={handleLeafletZoomChange}
                onCenterChange={handleLeafletCenterChange}
              />
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-semibold">Current View:</p>
                <p>Zoom: {leafletZoom.toFixed(1)}</p>
                <p>
                  Center: {leafletCenter[1].toFixed(4)},{" "}
                  {leafletCenter[0].toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
