const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri && uri.trim() !== '') {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`Connected to MongoDB at ${uri.includes('@') ? 'remote cluster' : uri}`);
      return;
    }
  } catch (err) {
    console.warn(`Could not connect to external MongoDB at ${uri}: ${err.message}`);
    console.log('Falling back to local MongoMemoryServer for development...');
  }

  // Graceful fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create({
      instance: { dbName: 'face_attendance' }
    });
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`Connected to MongoMemoryServer at ${memoryUri}`);
  } catch (err) {
    console.error('Failed to initialize MongoDB connection:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
