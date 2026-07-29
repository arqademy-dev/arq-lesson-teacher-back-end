import 'dotenv/config';
import { db } from '../src/config/db.js';
import { pricingTiers } from '../src/db/schema.js';

async function seedPricing() {
  const existing = await db.select().from(pricingTiers);
  if (existing.length > 0) {
    console.log('Pricing tiers already seeded — skipping. Delete existing rows first if you want to reseed.');
    process.exit(0);
  }

  const tiers = await db
    .insert(pricingTiers)
    .values([
      { minTopics: 1, maxTopics: 10, priceNaira: 5000, isActive: true },
      { minTopics: 11, maxTopics: 30, priceNaira: 10000, isActive: true },
      { minTopics: 31, maxTopics: null, priceNaira: 30000, isActive: true },
    ])
    .returning();

  console.log('Seeded pricing tiers:', tiers);
  process.exit(0);
}

seedPricing().catch((err) => {
  console.error(err);
  process.exit(1);
});