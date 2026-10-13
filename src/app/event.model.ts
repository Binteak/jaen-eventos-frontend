
export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_text: string | null;
  image_url: string | null;
  source_name: string;
  source_key: string;
  source_url: string;
  status: string;
  is_sponsored: boolean;
  instagram_url?: string | null;
}