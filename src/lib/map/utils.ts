import maplibregl from "maplibre-gl";

/**
 * Create a custom marker icon as base64 data URL
 */
export function createMarkerIcon(): string {
  const canvas = document.createElement("canvas");
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw circle with magenta fill
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = "magenta";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return canvas.toDataURL();
}

/**
 * Create a pulsating dot image for user location
 */
export function createPulsingDot(map: maplibregl.Map) {
  return {
    width: 100,
    height: 100,
    data: new Uint8Array(100 * 100 * 4),
    context: null as CanvasRenderingContext2D | null,

    onAdd: function (this: any) {
      const canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext("2d", { willReadFrequently: true });
    },

    render: function (this: any) {
      const duration = 1000;
      const t = (performance.now() % duration) / duration;

      const radius = (size: number) =>
        size * Math.sqrt(0.5 - Math.pow(t - 0.5, 2));
      const outerRadius = radius(25);
      const innerRadius = radius(15);

      const context = this.context;
      if (!context) return false;

      context.clearRect(0, 0, this.width, this.height);

      // Outer circle
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(0, 123, 255, " + (1 - t) + ")";
      context.fill();

      // Inner circle
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, innerRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(0, 123, 255, 0.8)";
      context.fill();

      this.data = context.getImageData(0, 0, this.width, this.height).data;

      map.triggerRepaint();
      return true;
    },
  };
}

/**
 * Add store marker layers to the map
 */
export function addStoreMarkerLayers(map: maplibregl.Map) {
  // Add layer for clusters
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "stores",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#b88e3a",
      "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
    },
  });

  // Add layer for cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "stores",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  // Add layer for individual stores
  map.addLayer({
    id: "unclustered-point",
    type: "symbol",
    source: "stores",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": "store-marker",
      "icon-size": 1,
      "icon-allow-overlap": false,
    },
  });
}

/**
 * Add click handlers for store markers
 */
export function addStoreClickHandlers(map: maplibregl.Map) {
  // Add click handler for clusters
  map.on("click", "clusters", async (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });
    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    if (clusterId == null) return;

    const source = map.getSource("stores") as maplibregl.GeoJSONSource;
    const zoom = await source.getClusterExpansionZoom(clusterId);

    map.easeTo({
      center: (features[0].geometry as any).coordinates,
      zoom: zoom,
    });
  });

  // Add click handler for individual stores
  map.on("click", "unclustered-point", (e) => {
    const coordinates = (e.features![0].geometry as any).coordinates.slice();
    const props = e.features![0].properties;

    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(
        `
        <div style="padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${props.chain_code.toUpperCase()} - ${
          props.code
        }</h3>
          <p style="margin: 0; font-size: 14px;">${props.type}</p>
          <p style="margin: 0; font-size: 14px;">${props.address}</p>
          <p style="margin: 0; font-size: 14px; color: #666;">${props.city}, ${
          props.zipcode
        }</p>
        </div>
      `
      )
      .addTo(map);
  });

  // Change cursor on hover
  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseenter", "unclustered-point", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "unclustered-point", () => {
    map.getCanvas().style.cursor = "";
  });
}
