#!/usr/bin/env node
/**
 * Upload LG product type images to Supabase Storage
 * and update all LG product records with the correct thumbnail_url
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tcnkumgqfezttiqzxsan.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = "product-images";
const IMAGE_DIR = "/home/ubuntu/lg-images";

// Map of product type -> local image file
const TYPE_IMAGES = {
  "outdoor-unit":       "lg-outdoor-unit.jpg",
  "outdoor-unit-small": "lg-outdoor-unit-small.jpg",
  "wall-mount-mega":    "lg-wall-mount.jpg",
  "wall-mount-standard":"lg-wall-mount.jpg",
  "wall-mount-extended":"lg-wall-mount.jpg",
  "wall-mount-high-eff":"lg-wall-mount.jpg",
  "artcool":            "lg-artcool.jpg",
  "multi-position-ahu": "lg-multi-position-ahu.jpg",
  "contractor-value":   "lg-multi-position-ahu.jpg",
  "cassette":           "lg-cassette.jpg",
  "ducted":             "lg-ducted.webp",
  "console":            "lg-console.jpg",
  "air-handler":        "lg-vertical-ahu.jpg",
  "multi-zone":         "lg-wall-mount.jpg",
};

function classifyProduct(title) {
  const t = title.toLowerCase();
  if (t.includes("odu") || t.includes("outdoor")) return "outdoor-unit";
  if (t.includes("wall mount mega")) return "wall-mount-mega";
  if (t.includes("wall mount standard")) return "wall-mount-standard";
  if (t.includes("wall mount extended")) return "wall-mount-extended";
  if (t.includes("wall mount high eff")) return "wall-mount-high-eff";
  if (t.includes("artcool") || t.includes("art cool")) return "artcool";
  if (t.includes("cv") || t.includes("contractor value")) return "contractor-value";
  if (t.includes("multi position") || t.includes("multi-position")) return "multi-position-ahu";
  if (t.includes("ducted") || t.includes("mid static") || t.includes("low static") || t.includes("high static")) return "ducted";
  if (t.includes("cassette") || t.includes("ceiling")) return "cassette";
  if (t.includes("console") || t.includes("low wall")) return "console";
  if (t.includes("vertical ahu") || t.includes("air handler")) return "air-handler";
  if (t.includes("multi zone") || t.includes("multi-zone") || t.includes("multi/single")) return "multi-zone";
  // Default: wall mount for indoor units, outdoor for outdoor
  if (t.includes("idu") || t.includes("indoor")) return "wall-mount-mega";
  return "outdoor-unit";
}

async function main() {
  // Step 1: Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    console.log(`Creating storage bucket: ${BUCKET}`);
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
      console.error("Failed to create bucket:", error.message);
      // Try to continue anyway - bucket might exist with different casing
    }
  }

  // Step 2: Upload each unique image to Supabase Storage
  const uploadedUrls = {};
  const uniqueFiles = [...new Set(Object.values(TYPE_IMAGES))];

  for (const filename of uniqueFiles) {
    const filePath = path.join(IMAGE_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `lg/${filename}`;
    const contentType = filename.endsWith(".webp") ? "image/webp" : "image/jpeg";

    // Upsert (overwrite if exists)
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`Failed to upload ${filename}:`, error.message);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    uploadedUrls[filename] = urlData.publicUrl;
    console.log(`Uploaded ${filename} -> ${urlData.publicUrl}`);
  }

  // Step 3: Get all LG products without images
  const { data: products, error: fetchErr } = await supabase
    .from("products")
    .select("id, sku, title, thumbnail_url")
    .eq("brand", "LG")
    .is("thumbnail_url", null);

  if (fetchErr) {
    console.error("Failed to fetch products:", fetchErr.message);
    return;
  }

  console.log(`\nFound ${products.length} LG products without images`);

  // Step 4: Update each product with the correct image URL
  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const type = classifyProduct(product.title);
    const imageFile = TYPE_IMAGES[type];
    const imageUrl = uploadedUrls[imageFile];

    if (!imageUrl) {
      console.error(`No URL for type ${type} (${product.sku})`);
      failed++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("products")
      .update({ thumbnail_url: imageUrl })
      .eq("id", product.id);

    if (updateErr) {
      console.error(`Failed to update ${product.sku}:`, updateErr.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);

  // Print summary by type
  const typeCounts = {};
  for (const product of products) {
    const type = classifyProduct(product.title);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  console.log("\nProducts by type:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

main().catch(console.error);
