/**
 * Database types for the Heat Pump Ranch & Supply Co schema.
 *
 * Generated from migrations 0001 + 0002 + 0003. When the schema changes,
 * regenerate via Supabase MCP or `supabase gen types typescript`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin";
export type ProductType = "equipment" | "accessory" | "part";
export type DocType = "spec_sheet" | "installation_manual" | "warranty" | "brochure" | "other";
export type CompatibilityRule = "required" | "recommended" | "optional";
export type PricingEntity = "product" | "system";
export type ContractorStatus = "pending" | "approved" | "suspended";
export type QuoteStatus = "draft" | "sent" | "accepted" | "converted" | "expired";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "stripe" | "net_terms" | "invoice";
export type PaymentStatus = "pending" | "paid" | "partial" | "overdue" | "refunded";
export type SyncStatus = "running" | "completed" | "failed" | "partial";
export type SyncPortal = "lg" | "aciq" | "ahri" | "hvacdirect" | "manual";
export type SyncItemAction = "created" | "updated" | "unchanged" | "discontinued" | "failed";
export type NotificationType =
  | "sync_complete" | "sync_failed" | "new_products" | "price_change"
  | "new_accessories" | "discontinued_products" | "order" | "quote" | "system";

export interface Product {
  id: number;
  sku: string;
  brand: string;
  model_number: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  category_id: number | null;
  product_type: ProductType;
  specs: Json | null;
  weight: string | null;
  width: string | null;
  height: string | null;
  depth: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  source_portal: SyncPortal | null;
  source_id: string | null;
  source_url: string | null;
  last_synced_at: string | null;
  discontinued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SystemPackage {
  id: number;
  system_sku: string;
  title: string;
  description: string | null;
  ahri_number: string | null;
  specs: Json | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPricing {
  id: number;
  entity_type: PricingEntity;
  entity_id: number;
  tier_id: number;
  cost_equipment: string;
  cost_freight: string;
  cost_parts: string;
  cost_tax: string;
  total_price: string;
  msrp: string | null;
  updated_at: string;
}

export interface PricingTier {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface AppUser {
  id: number;
  auth_id: string | null;
  name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_signed_in: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  file_key: string | null;
  source_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Cart {
  id: number;
  user_id: number | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  entity_type: PricingEntity;
  entity_id: number;
  quantity: number;
  created_at: string;
}

export interface AccessoryCompatibility {
  id: number;
  accessory_product_id: number;
  compatible_product_id: number | null;
  compatible_system_id: number | null;
  rule_type: CompatibilityRule;
  notes: string | null;
  created_at: string;
}

export interface SystemComponent {
  id: number;
  system_id: number;
  product_id: number;
  quantity: number;
  role: string | null;
  created_at: string;
}

/**
 * Minimal Database type for typed Supabase client. Only the tables we
 * actually query from the app code are listed here. Add more as needed.
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: AppUser;
        Insert: Partial<AppUser> & { auth_id?: string | null };
        Update: Partial<AppUser>;
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & { name: string; slug: string };
        Update: Partial<Category>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { sku: string; brand: string; title: string };
        Update: Partial<Product>;
      };
      product_images: {
        Row: ProductImage;
        Insert: Partial<ProductImage> & { product_id: number; url: string };
        Update: Partial<ProductImage>;
      };
      system_packages: {
        Row: SystemPackage;
        Insert: Partial<SystemPackage> & { system_sku: string; title: string };
        Update: Partial<SystemPackage>;
      };
      product_pricing: {
        Row: ProductPricing;
        Insert: Partial<ProductPricing> & {
          entity_type: PricingEntity;
          entity_id: number;
          tier_id: number;
        };
        Update: Partial<ProductPricing>;
      };
      pricing_tiers: {
        Row: PricingTier;
        Insert: Partial<PricingTier> & { name: string };
        Update: Partial<PricingTier>;
      };
      carts: {
        Row: Cart;
        Insert: Partial<Cart>;
        Update: Partial<Cart>;
      };
      cart_items: {
        Row: CartItem;
        Insert: Partial<CartItem> & {
          cart_id: number;
          entity_type: PricingEntity;
          entity_id: number;
        };
        Update: Partial<CartItem>;
      };
      accessory_compatibility: {
        Row: AccessoryCompatibility;
        Insert: Partial<AccessoryCompatibility> & {
          accessory_product_id: number;
        };
        Update: Partial<AccessoryCompatibility>;
      };
      system_components: {
        Row: SystemComponent;
        Insert: Partial<SystemComponent> & {
          system_id: number;
          product_id: number;
        };
        Update: Partial<SystemComponent>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
