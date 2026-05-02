import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tcnkumgqfezttiqzxsan.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmt1bWdxZmV6dHRpcXp4c2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM0MDQzMiwiZXhwIjoyMDkyOTE2NDMyfQ.eYbKyg1EKP83afWg0gy3JPKzS4FgL4nhwjSpr_zKm78"
);

const { data } = await supabase
  .from("products")
  .select("sku, title")
  .eq("brand", "LG")
  .is("thumbnail_url", null);

const types = {};
for (const p of data) {
  let type = "unknown";
  const t = p.title.toLowerCase();
  if (t.includes("odu") || t.includes("outdoor")) type = "outdoor-unit";
  else if (t.includes("wall mount mega")) type = "wall-mount-mega";
  else if (t.includes("wall mount standard")) type = "wall-mount-standard";
  else if (t.includes("wall mount extended")) type = "wall-mount-extended";
  else if (t.includes("artcool") || t.includes("art cool")) type = "artcool";
  else if (t.includes("ducted") || (t.includes("mid static") || t.includes("low static") || t.includes("high static"))) type = "ducted";
  else if (t.includes("cassette") || t.includes("ceiling")) type = "cassette";
  else if (t.includes("console") || t.includes("low wall")) type = "console";
  else if (t.includes("vertical ahu") || t.includes("air handler")) type = "air-handler";
  else if (t.includes("floor") || t.includes("standing")) type = "floor-mount";
  else if (t.includes("multi zone") || t.includes("multi-zone")) type = "multi-zone";
  else if (t.includes("thermostat") || t.includes("controller") || t.includes("wifi")) type = "accessory";

  if (!types[type]) types[type] = [];
  types[type].push(p.sku);
}

for (const [type, skus] of Object.entries(types)) {
  console.log(`${type}: ${skus.length} products`);
  console.log(`  Sample: ${skus.slice(0, 3).join(", ")}`);
}

if (types["unknown"]) {
  console.log("\nUnknown product titles:");
  for (const sku of types["unknown"].slice(0, 20)) {
    const p = data.find(d => d.sku === sku);
    console.log(`  ${sku} | ${p.title}`);
  }
}
