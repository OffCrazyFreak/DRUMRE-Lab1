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
