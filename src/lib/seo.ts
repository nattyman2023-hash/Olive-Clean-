const SITE_URL = "https://oliveclean.com";
const DEFAULT_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7544852-3239-488d-87ed-5ac0b647de1e/id-preview-60305a94--90d75a69-5903-40ad-ac17-0f516114a859.lovable.app-1774018047691.png";

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  canonicalPath?: string;
}

export const seoConfig: Record<string, SEOConfig> = {
  "/": {
    title: "Olive Clean — Premium Residential Cleaning Nashville TN",
    description: "Reclaim your weekends with Olive Clean's premium eco-friendly residential cleaning in Nashville. Background-checked teams serving Belle Meade, Brentwood, Franklin & beyond.",
    keywords: "house cleaning Nashville, residential cleaning Nashville TN, eco-friendly cleaning service, maid service Nashville, home cleaning Belle Meade",
  },
  "/about": {
    title: "About Olive Clean — Nashville's Trusted Cleaning Company",
    description: "Meet the team behind Nashville's most trusted cleaning service. Trained in the Debbie Sardone Speed Cleaning method, Olive Clean delivers consistent, premium results.",
    keywords: "about Olive Clean, Nashville cleaning company, Debbie Sardone method, professional cleaning technicians Nashville",
  },
  "/why-us": {
    title: "Why Choose Olive Clean — Background-Checked & Insured Teams",
    description: "Background-checked, insured & bonded teams. The Olive Standard™ 40-point checklist. 100% eco-friendly products. See why Nashville families trust Olive Clean.",
    keywords: "why Olive Clean, trusted cleaners Nashville, insured cleaning service, background checked cleaners, Olive Standard checklist",
  },
  "/perks": {
    title: "Perks Club — Save Up to 40% on Recurring Cleaning",
    description: "Join the Olive Clean Perks Club and save up to 40% on cleaning. Earn free cleanings, referral bonuses, and priority scheduling as a loyal member.",
    keywords: "cleaning discount Nashville, loyalty program cleaning, Perks Club, save on house cleaning, referral bonus cleaning",
  },
  "/team": {
    title: "Meet Our Team — Olive Clean's Professional Technicians",
    description: "Real people, real passion. Meet the professionally trained, background-checked cleaning technicians who make your Nashville home sparkle.",
    keywords: "cleaning team Nashville, professional cleaning technicians, Olive Clean technicians, house cleaning technicians near me",
  },
  "/careers": {
    title: "Careers at Olive Clean — Join Nashville's Best Cleaning Team",
    description: "Looking for a rewarding career in cleaning? Olive Clean offers competitive pay, flexible scheduling, and paid training. Apply today!",
    keywords: "cleaning jobs Nashville, house cleaning career, maid service jobs, Olive Clean hiring",
  },
  "/book": {
    title: "Book a Free Cleaning Estimate — Olive Clean Nashville",
    description: "Get a free personalized cleaning estimate for your Nashville home. Choose from Essential, General, Deep Clean, or Makeover packages.",
    keywords: "book cleaning Nashville, free cleaning estimate, schedule house cleaning, cleaning quote Nashville",
  },
  "/terms": {
    title: "Terms of Service — Olive Clean",
    description: "Read the Terms of Service for Olive Clean's residential cleaning services in Nashville, Tennessee.",
    keywords: "terms of service, cleaning service terms, Olive Clean policies",
  },
  "/privacy": {
    title: "Privacy Policy — Olive Clean",
    description: "Learn how Olive Clean collects, uses, and protects your personal information. Your privacy matters to us.",
    keywords: "privacy policy, data protection, Olive Clean privacy",
  },
  // Services
  "/services/essential": {
    title: "Essential Clean — Quick Home Refresh | Olive Clean Nashville",
    description: "Starting at $120. A routine clean for well-maintained homes. Surface dusting, vacuuming, mopping, and sanitizing with eco-friendly products.",
    keywords: "essential cleaning Nashville, basic house cleaning, routine cleaning service, affordable cleaning Nashville",
  },
  "/services/general": {
    title: "General Clean — Thorough Weekly Cleaning | Olive Clean Nashville",
    description: "Starting at $180. Top-to-bottom routine cleaning including appliance exteriors, detailed dusting, and bathroom scrub. Nashville's most popular package.",
    keywords: "general cleaning Nashville, weekly house cleaning, thorough cleaning service, regular maid service Nashville",
  },
  "/services/deep-clean": {
    title: "Signature Deep Clean — Premium Detail | Olive Clean Nashville",
    description: "Starting at $320. Inside appliances, window interiors, baseboards, and beyond. A comprehensive room-by-room reset for your Nashville home.",
    keywords: "deep cleaning Nashville, deep clean house, spring cleaning Nashville, move-in cleaning Nashville",
  },
  "/services/makeover": {
    title: "Makeover Deep Clean — White-Glove Service | Olive Clean Nashville",
    description: "Starting at $450+. Fully customizable white-glove cleaning for luxury homes, post-renovation, or seasonal overhauls. Nashville's most comprehensive clean.",
    keywords: "luxury cleaning Nashville, white glove cleaning, post-renovation cleaning, estate cleaning Nashville",
  },
  // Areas
  "/areas/belle-meade": {
    title: "House Cleaning Belle Meade — Olive Clean Nashville",
    description: "Premium eco-friendly cleaning for Belle Meade homes. Experienced with historic estates and luxury properties. Background-checked, insured teams.",
    keywords: "house cleaning Belle Meade, maid service Belle Meade, cleaning service Belle Meade Nashville, luxury home cleaning",
  },
  "/areas/brentwood": {
    title: "House Cleaning Brentwood TN — Olive Clean Nashville",
    description: "Trusted cleaning services for Brentwood families. Kid- and pet-safe products, consistent teams, and flexible scheduling for busy households.",
    keywords: "house cleaning Brentwood, maid service Brentwood TN, cleaning service Brentwood, family cleaning Brentwood",
  },
  "/areas/franklin": {
    title: "House Cleaning Franklin TN — Olive Clean Nashville",
    description: "Exceptional cleaning for Franklin homes from downtown to Berry Farms. Green products, professional teams, and flexible plans.",
    keywords: "house cleaning Franklin TN, maid service Franklin, cleaning service Franklin Tennessee, green cleaning Franklin",
  },
  "/areas/green-hills": {
    title: "House Cleaning Green Hills — Olive Clean Nashville",
    description: "Reliable premium cleaning in the heart of Nashville. Serving condos, townhomes, and houses in Green Hills with quick response times.",
    keywords: "house cleaning Green Hills, maid service Green Hills Nashville, cleaning service Green Hills, Nashville cleaning",
  },
  "/areas/west-nashville": {
    title: "House Cleaning West Nashville — Olive Clean",
    description: "Modern cleaning for Nashville's creative west side. From Sylvan Park cottages to The Nations' contemporary homes. Eco-friendly and flexible.",
    keywords: "house cleaning West Nashville, maid service Sylvan Park, cleaning Nations Nashville, West Nashville cleaning",
  },
};

export function getSEO(path: string): SEOConfig {
  return seoConfig[path] || seoConfig["/"];
}

export { SITE_URL, DEFAULT_OG_IMAGE };
