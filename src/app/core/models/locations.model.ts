export interface LocationsHeader {
  kicker: string;
  title: string;
}

/** Named `LocationItem`, not `Location`, to avoid shadowing the DOM `Location` global. */
export interface LocationItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  schedule: string;
  emergencyService: string;
}

/** GET /api/landing/locations — static, cacheable content. */
export interface Locations {
  header: LocationsHeader;
  gallery: string[];
  items: LocationItem[];
}
