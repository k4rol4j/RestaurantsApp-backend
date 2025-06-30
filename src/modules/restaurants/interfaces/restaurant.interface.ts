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
  location: string;
  cuisine: string;
  rating: number;
  imageUrl: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  reviews?: Review[];
  reservations?: Reservation[];
}
