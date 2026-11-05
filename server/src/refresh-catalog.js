// Explicit one-time update for the supplied Farmeri product photography.
// Does not remove products, orders or customer data; real inventory/prices are preserved.
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { Product, Category, Settings, settings } from './models.js';
try {
  await mongoose.connect(config.mongo);
  const catalog = JSON.parse(await readFile(new URL('./catalog.json', import.meta.url), 'utf8'));
  for (const p of catalog) {
    const { price, discountPrice, variants, ...editorial } = p;
    await Product.updateOne({ slug: p.slug }, {
      $set: editorial,
      $setOnInsert: { price, discountPrice, variants },
    }, { upsert: true, runValidators: true });
  }
  // Only retire the original generated sample catalog. Never delete order-linked records.
  await Product.updateMany({ images: { $elemMatch: { $regex: '^/assets/placeholder-' } } }, {
    $set: { isActive: false, isFeatured: false, isNewArrival: false },
  });
  for (const c of [{name:'T-shirts',slug:'oversized-tees'}, {name:'Hoodies',slug:'hoodies'}]) {
    await Category.updateOne({slug:c.slug}, {$set:c}, {upsert:true});
  }
  await Category.updateOne({slug:'accessories'}, {$set:{isActive:false}});
  await settings();
  await Settings.updateOne({key:'site'}, {$set:{headline:'EVERY FIT COUNTS'}});
  console.log('Farmeri catalog refreshed. New products have zero stock; set verified prices, sizes and stock in admin before sales.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
