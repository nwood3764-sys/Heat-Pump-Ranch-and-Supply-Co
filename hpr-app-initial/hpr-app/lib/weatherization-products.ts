/**
 * Weatherization product data — static product definitions for Green Fiber
 * cellulose insulation products. These are rendered statically until pricing
 * is loaded into the DB via a future sync script.
 *
 * When pricing is added, these products will also be inserted into the
 * `products` table with product_type = 'equipment' and a weatherization
 * category_id, at which point the catalog page can render them dynamically.
 */

export interface WeatherizationProduct {
  slug: string;
  brand: string;
  title: string;
  shortDescription: string;
  thumbnailUrl: string | null;
  bagSize: string;
  rValuePerInch: string | null;
  coverage: string | null;
  insulationType: string;
  applications: string[];
  features: string[];
  certifications: string[];
  description: string;
  specs: Record<string, string>;
  note: string | null;
}

export const GREEN_FIBER_PRODUCTS: WeatherizationProduct[] = [
  {
    slug: "sanctuary-blow-in-insulation",
    brand: "Green Fiber",
    title: "SANCTUARY\u00AE Blow-In or Spray-Applied Insulation",
    shortDescription:
      "The all-in-one cellulose insulation that can be blow-in, spray-applied, or dense-packed. Made with 85% recycled materials.",
    thumbnailUrl: "/tiles/weatherization/sanctuary.jpg",
    bagSize: "25 lbs",
    rValuePerInch: "3.7",
    coverage: "27.4 sq. ft. per bag at R-30",
    insulationType: "Cellulose",
    applications: ["Walls", "Attics", "Floors", "Ceilings"],
    features: [
      "60% Reduction in Sound Power",
      "25% Savings on Heating and Cooling",
      "Class 1/A Advanced Fire Resistance",
      "Made with 85% Recycled Materials",
      "Free from Harmful Additives",
    ],
    certifications: [
      "UL Classified",
      "USDA BioPreferred",
      "ENERGY STAR",
      "Declare",
      "Red List Free",
    ],
    description:
      "SANCTUARY by Greenfiber is the all-in-one cellulose insulation that can be blow-in, spray-applied, or dense-packed. It can be easily installed over existing insulation and unlike batt or roll alternatives, it\u2019s engineered to fill every gap, void, and hard-to-reach space, forming a dense barrier that reduces air infiltration to boost thermal performance and reduce sound. Made with 85% recycled materials, free from harmful additives, SANCTUARY supports better living and a greener planet while meeting modern building codes and delivering lasting value for your home.",
    specs: {
      "Bag Size": "25 lbs",
      "R-Value per Inch": "3.7",
      "Coverage at R-30": "27.4 sq. ft. per bag",
      "Insulation Type": "Cellulose",
      "Density (settled)": "1.5 pcf",
      "Thermal Resistance": "3.7 R/in. (at 4 in. thickness)",
      "Flame Spread": "5",
      "Smoke Developed": "5",
      "Critical Radiant Flux": "\u2265 0.12 w/cm\u00B2",
      "Smoldering Combustion": "\u2264 15.0%",
      "Moisture Absorption": "Acceptable",
      "Corrosiveness": "Acceptable",
      "Fungi Resistance": "Acceptable",
      "Odor Emission": "Acceptable",
      "Installation Methods": "Blow-in, Spray-Applied, Dense-Pack",
    },
    note: null,
  },
  {
    slug: "sanctuary-defense-insulation",
    brand: "Green Fiber",
    title: "SANCTUARY\u00AE DEFENSE Blow-In or Spray-Applied Insulation",
    shortDescription:
      "High-performance cellulose insulation with BORABARRIER\u00AE pest protection against 25 types of household pests.",
    thumbnailUrl: "/tiles/weatherization/sanctuary-defense.jpg",
    bagSize: "25 lbs",
    rValuePerInch: "3.7",
    coverage: "27.4 sq. ft. per bag at R-30",
    insulationType: "Cellulose",
    applications: ["Walls", "Attics", "Floors", "Ceilings"],
    features: [
      "Kills 25 Types of Household Pests",
      "60% Reduction in Sound Power",
      "25% Savings on Heating and Cooling",
      "Class 1/A Advanced Fire Resistance",
      "BORABARRIER\u00AE EPA-Registered Pesticide Treatment",
    ],
    certifications: [
      "UL Classified",
      "USDA BioPreferred",
      "ENERGY STAR",
      "Declare",
      "Red List Free",
    ],
    description:
      "SANCTUARY DEFENSE is a high-performance, all-in-one cellulose insulation treated with BORABARRIER\u00AE EPA-registered pesticide that ensures long-lasting protection from pests. Blown in, dense-packed or spray-applied, this cellulose is the smartest way to insulate a home, providing superior quiet, comfort, efficiency and fire protection.",
    specs: {
      "Bag Size": "25 lbs",
      "R-Value per Inch": "3.7",
      "Coverage at R-30": "27.4 sq. ft. per bag",
      "Insulation Type": "Cellulose",
      "Density (settled)": "1.5 pcf",
      "Thermal Resistance": "3.7 R/in. (at 4 in. thickness)",
      "Flame Spread": "10",
      "Smoke Developed": "0",
      "Critical Radiant Flux": "\u2265 0.12 w/cm\u00B2",
      "Smoldering Combustion": "\u2264 15.0%",
      "Moisture Absorption": "Acceptable",
      "Corrosiveness": "Acceptable",
      "Fungi Resistance": "Acceptable",
      "Odor Emission": "Acceptable",
      "Pest Treatment": "BORABARRIER\u00AE (EPA-Registered)",
      "Installation Methods": "Blow-in, Spray-Applied, Dense-Pack",
    },
    note: "Contact us for availability and pricing.",
  },
  {
    slug: "frm-insulation",
    brand: "Green Fiber",
    title: "Greenfiber FRM Insulation",
    shortDescription:
      "Two-hour fire-rated insulation for the SANCTUARY\u00AE Firewall Assembly. Ideal for townhome and multifamily construction.",
    thumbnailUrl: "/tiles/weatherization/frm-insulation.jpg",
    bagSize: "30 lbs",
    rValuePerInch: null,
    coverage: null,
    insulationType: "Cellulose",
    applications: ["Walls", "Ceilings"],
    features: [
      "Two-Hour Fire Resistance Rating (UL Rated)",
      "Meets Stringent Energy Efficiency Codes",
      "Best-in-Class Sound-Blocking Firewall",
      "Achieves 3 ACH50 Air Changes Per Hour",
      "Spray-Applied for Complete Cavity Fill",
    ],
    certifications: ["UL Listed"],
    description:
      "When used in combination with the proprietary U370 firewall design \u2014 the SANCTUARY Two-Hour Firewall \u2014 Greenfiber FRM Insulation meets the requirements for a two-hour fire rating, making it ideal for townhome and multifamily construction. Rated by Underwriters Laboratory, the U370 firewall works together with Greenfiber FRM Insulation to achieve defect-free installation. Two opposing and offset studded walls create an 8\" cavity into which FRM is spray-applied, filling the entire cavity and reducing air infiltration in the assembly.",
    specs: {
      "Bag Size": "30 lbs",
      "Insulation Type": "Cellulose",
      "Fire Rating": "2-Hour (UL U370 Assembly)",
      "Installation Method": "Spray-Applied",
      "Cavity Size": "8 inches (opposing offset stud walls)",
      "Air Tightness": "3 ACH50",
    },
    note: "Designed for use with the SANCTUARY\u00AE Two-Hour Firewall (U370) assembly.",
  },
  {
    slug: "agritherm-insulation",
    brand: "Green Fiber",
    title: "Greenfiber Agritherm Insulation",
    shortDescription:
      "Designed for agricultural structures. Non-corrosive formula ideal for metal buildings, barns, and low-pitch roofs.",
    thumbnailUrl: "/tiles/weatherization/agritherm.jpg",
    bagSize: "28 lbs",
    rValuePerInch: null,
    coverage: "31.5 sq. ft. per bag at R-30",
    insulationType: "Cellulose",
    applications: ["Agricultural Structures", "Metal Buildings", "Barns"],
    features: [
      "Absorbs Sound and Smells",
      "Enhances Comfort for Animals, Farmhands, and Neighbors",
      "Maintains Thermal Performance in Hot or Cold Climates",
      "Non-Corrosive Formula for Metal Structures",
      "Superior R-Value vs. Other Insulation",
    ],
    certifications: [],
    description:
      "Designed for the unique demands of agricultural buildings, Agritherm insulation delivers reliable performance in every season. Its high R-value helps maintain consistent temperatures, while the non-corrosive formula makes it a smart choice for metal structures, barns, and low-pitch roofs. By absorbing sound and reducing odors, Agritherm creates a quieter, cleaner, and more comfortable environment for animals, farmhands, and neighbors, all while standing up to tough climates year after year.",
    specs: {
      "Bag Size": "28 lbs",
      "Coverage at R-30": "31.5 sq. ft. per bag",
      "Insulation Type": "Cellulose",
      "Formula": "All-Borate (Non-Corrosive)",
      "Installation Method": "Blow-In",
      "R-13 Coverage": "74.1 sq. ft. per bag",
      "R-19 Coverage": "50.7 sq. ft. per bag",
      "R-30 Coverage": "31.5 sq. ft. per bag",
      "R-38 Coverage": "24.2 sq. ft. per bag",
      "R-49 Coverage": "18.8 sq. ft. per bag",
    },
    note: "For use in non-residential agricultural structures only.",
  },
  {
    slug: "applegate-stabilized-insulation",
    brand: "Green Fiber",
    title: "Applegate\u00AE Stabilized Cellulose Insulation",
    shortDescription:
      "Trusted by professionals for consistent coverage and reduced dust during installation.",
    thumbnailUrl: "/tiles/weatherization/applegate.jpg",
    bagSize: "26.5 lbs",
    rValuePerInch: "3.55",
    coverage: "29.8 sq. ft. per bag at R-30",
    insulationType: "Cellulose",
    applications: ["Walls", "Attics", "Floors", "Ceilings"],
    features: [
      "Trusted & Time-Tested Formula",
      "Consistent Coverage and Reliable Fill",
      "Reduced Dust Profile for Cleaner Installation",
      "Designed for Professional Installers",
    ],
    certifications: ["Greenguard Certified"],
    description:
      "Applegate Stabilized delivers a unique installation experience earned through decades of contractor trust. Designed for professionals who value consistency, reduced dust, and dependable coverage, it reflects Greenfiber\u2019s commitment to quality and sustainability.",
    specs: {
      "Bag Size": "26.5 lbs",
      "R-Value per Inch": "3.55",
      "Coverage at R-30": "29.8 sq. ft. per bag",
      "Insulation Type": "Cellulose",
      "Density (settled)": "1.23 \u2013 1.31 pcf",
      "Thermal Resistance": "3.53 \u2013 3.59 R/in. (at 4 in. thickness)",
      "Flame Spread": "10",
      "Smoke Developed": "35",
      "Critical Radiant Flux": "\u2265 0.12 w/cm\u00B2",
      "Smoldering Combustion": "\u2264 15%",
      "Moisture Absorption": "Acceptable",
      "Corrosiveness": "Acceptable",
      "Fungi Resistance": "Acceptable",
      "Odor Emission": "Acceptable",
      "Installation Methods": "Blow-in, Spray-Applied, Dense-Pack",
    },
    note: null,
  },
];

// ---------------------------------------------------------------------------
// Sub-category definitions
// ---------------------------------------------------------------------------

export interface WeatherizationSubCategory {
  slug: string;
  title: string;
  description: string;
  products: WeatherizationProduct[];
}

export const WEATHERIZATION_SUB_CATEGORIES: Record<string, WeatherizationSubCategory> = {
  "cellulose-insulation": {
    slug: "cellulose-insulation",
    title: "Cellulose Insulation",
    description:
      "Eco-friendly cellulose insulation from Green Fiber. Blow-in, spray-applied, and dense-pack options for residential, commercial, and agricultural applications.",
    products: GREEN_FIBER_PRODUCTS,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getProductBySlug(slug: string): WeatherizationProduct | undefined {
  return GREEN_FIBER_PRODUCTS.find((p) => p.slug === slug);
}

export function getSubCategoryBySlug(slug: string): WeatherizationSubCategory | undefined {
  return WEATHERIZATION_SUB_CATEGORIES[slug];
}
