export interface Reservation {
  date: string;
  time: string;
}

export interface Review {
  userId: number;
  rating: number;
  comment: string;
  date: Date;
}

export interface Restaurant {
  id: number;
  name: string;
  rating: number;
  imageUrl: string | null;
  description: string | null;
  openingHours: string | null;
  capacity: number;

  address: {
    city: string;
    district?: string | null;
    street?: string | null;
    streetNumber?: string | null;
    latitude: number;
    longitude: number;
  } | null;

  cuisines: {
    cuisine: {
      id: number;
      name: string;
    };
  }[];

  imageGallery?: string | null;
  menu?: any;
}
