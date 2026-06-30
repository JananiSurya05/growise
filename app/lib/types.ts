export type Role = "farmer" | "consumer" | "government";

export interface AppUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  location?: string;
}

export interface Crop {
  id: string;
  farmer_id: string;
  name: string;
  price: number;
  quantity: number;
  location: string;
  image_url: string | null;
  status: string;
  badge: string | null;
  demand: string | null;
  season: string | null;
  created_at: string;
}

export interface CropWithFarmer extends Crop {
  users?: { name: string } | null;
}

export interface Order {
  id: string;
  consumer_id: string;
  farmer_id: string;
  crop_id: string;
  quantity: number;
  total: number;
  amount_saved: number;
  status: "Processing" | "On the way" | "Delivered";
  created_at: string;
  updated_at: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
}

export interface OrderWithItems extends Order {
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  crop_id: string;
  crop_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{ description: string }>;
  wind: { speed: number };
  clouds: { all: number };
  cod: number;
}

export interface AdvisorRequest {
  question: string;
}

export interface DiseaseRequest {
  image: string;
}

export interface ApiErrorResponse {
  error: string;
}
