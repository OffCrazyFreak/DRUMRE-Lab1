export interface Store {
  chain_code: string;
  code: string;
  type: string;
  address: string;
  city: string;
  zipcode: string;
  lat?: number;
  lon?: number;
}

export interface GeocodedStore extends Store {
  lat: number;
  lon: number;
}

export interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}
