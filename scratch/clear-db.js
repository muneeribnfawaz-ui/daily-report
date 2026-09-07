const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const collectionName = col.name;
    const collection = mongoose.connection.db.collection(collectionName);
    
    if (collectionName === 'users') {
      const result = await collection.deleteMany({ role: { $ne: 'admin' } });
      console.log(`Deleted ${result.deletedCount} non-admin users.`);
    } else {
      const result = await collection.deleteMany({});
      console.log(`Cleared collection: ${collectionName} (${result.deletedCount} documents deleted)`);
    }
  }
  
  console.log("Database cleared successfully.");
  process.exit(0);
}
run().catch(err => { console.error(err); process.exit(1); });
