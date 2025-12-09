"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeocodedStore } from "@/types/store";

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LeafletMapComponentProps {
  stores: GeocodedStore[];
  center?: [number, number];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}

// Custom marker icon for stores
const storeIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="magenta" stroke="white" stroke-width="2"/>
    </svg>
  `),
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -6],
});

// Custom marker icon for user location
const userLocationIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="15" r="8" fill="rgba(0, 123, 255, 0.8)" stroke="rgba(0, 123, 255, 0.3)" stroke-width="4"/>
    </svg>
  `),
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Component to handle map events and user location
function MapEventHandler({
  onZoomChange,
  onCenterChange,
  userLocation,
}: {
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
  userLocation: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    };

    const handleMoveEnd = () => {
      if (onCenterChange) {
        const center = map.getCenter();
        onCenterChange([center.lng, center.lat]);
      }
    };

    map.on("zoomend", handleZoomEnd);
    map.on("moveend", handleMoveEnd);

    return () => {
      map.off("zoomend", handleZoomEnd);
      map.off("moveend", handleMoveEnd);
    };
  }, [map, onZoomChange, onCenterChange]);

  // Center map on user location when available
  useEffect(() => {
    if (userLocation && map) {
      map.setView([userLocation[1], userLocation[0]], 13);
    }
  }, [userLocation, map]);

  return null;
}

export default function LeafletMapComponent({
  stores,
  center,
  zoom = 6,
  onZoomChange,
  onCenterChange,
}: LeafletMapComponentProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    45.4039, 14.7978,
  ]); // Delnice, Croatia (lat, lon for Leaflet)
  const [mapZoom, setMapZoom] = useState<number>(zoom);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(userCoords);
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(13); // Zoom in when user location is available
        },
        (error) => {
          console.log("Geolocation error:", error);
          setMapZoom(6); // Keep default zoom when no location
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMapZoom(6); // Keep default zoom when geolocation not supported
    }
  }, []);

  const initialCenter = center ? [center[1], center[0]] : mapCenter;
  const initialZoom = center ? zoom : mapZoom;

  return (
    <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={initialCenter as [number, number]}
        zoom={initialZoom}
        style={{ height: "500px", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapEventHandler
          onZoomChange={onZoomChange}
          onCenterChange={onCenterChange}
          userLocation={userLocation}
        />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation[1], userLocation[0]]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold mb-1">Your Location</h3>
                <p className="text-sm text-gray-600">
                  {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Store markers */}
        {stores.map((store, index) => {
          if (!store.lat || !store.lon) return null;

          return (
            <Marker
              key={`${store.chain_code}-${store.code}-${index}`}
              position={[store.lat, store.lon]}
              icon={storeIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold mb-1">
                    {store.chain_code.toUpperCase()} - {store.code}
                  </h3>
                  <p className="text-sm mb-0.5">{store.type}</p>
                  <p className="text-sm mb-0.5">{store.address}</p>
                  <p className="text-sm text-gray-600">
                    {store.city}, {store.zipcode}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
