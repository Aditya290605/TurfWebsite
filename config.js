/**
 * CA Sports Arena - Centralized Client Configuration
 * Everything that changes per client lives in this file.
 */
const TURF_CONFIG = {
  // Brand identity
  name: "CA Sports Arena",
  shortName: "CA Turf",
  tagline: "Pro-Grade Box Cricket & Football Under Floodlights",
  description: "Experience premium synthetic turf with 500 LUX shadow-free floodlights, instant slot booking, and pro locker rooms in Baner, Pune.",
  
  // Location
  location: {
    area: "Baner",
    city: "Pune",
    landmark: "Behind Balewadi High Street",
    fullAddress: "Survey No. 48/2, Near Balewadi High Street, Baner, Pune, Maharashtra 411045",
    mapUrl: "https://maps.google.com/?q=Baner+Pune",
    lat: 18.5590,
    lng: 73.7868
  },

  // Contact & WhatsApp
  contact: {
    phone: "+91 98230 45678",
    phoneRaw: "9823045678",
    whatsappNumber: "919823045678", // Country code + 10 digits, no + or spaces
    email: "play@casportsarena.in",
    instagram: "casportsarena"
  },

  // Operating Hours
  hours: {
    display: "6:00 AM – 12:00 AM Midnight (Daily)",
    openHour: 6,   // 6 AM
    closeHour: 24, // 12 AM Midnight
    slotLengthMinutes: 60
  },

  // Dynamic Pricing Structure
  pricing: {
    weekdayPerHour: 500, // Monday - Friday
    weekendPerHour: 800, // Saturday - Sunday
    currencySymbol: "₹",
    currencyCode: "INR",
    advancePercentage: 25, // 25% advance to hold slot online, or full pay
    advanceMinAmount: 200,  // minimum ₹200 advance
    platformFee: 0
  },

  // Quick facts row
  quickFacts: [
    { label: "Turf Surface", value: "FIFA 50mm Monofilament", icon: "surface" },
    { label: "Night Match", value: "500 LUX LED Lighting", icon: "lighting" },
    { label: "Arena Size", value: "110 × 65 ft Box Court", icon: "dimensions" },
    { label: "Safe Parking", value: "40+ Dedicated Car Slots", icon: "parking" },
    { label: "Amenities", value: "Showers, Canteen & Dugouts", icon: "amenities" }
  ],

  // Match formats supported
  formats: [
    { id: "box-cricket", name: "Box Cricket (6–8 a side)", default: true },
    { id: "football", name: "5-a-side Football", default: false },
    { id: "practice", name: "Net Practice / Coaching", default: false }
  ],

  // Verified venue rules & policies (no fake reviews)
  venueRules: [
    "Rubber studs or flat-sole turf shoes only (metal spikes strictly prohibited)",
    "Complimentary match ball and cricket stumps provided with each booking",
    "Please report 10 minutes prior to your booked slot time",
    "Advance deposit refundable if cancelled at least 4 hours before slot"
  ]
};

// Expose on window for vanilla browser script usage
if (typeof window !== 'undefined') {
  window.TURF_CONFIG = TURF_CONFIG;
}
