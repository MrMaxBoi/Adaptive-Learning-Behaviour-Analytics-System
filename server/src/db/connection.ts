import mongoose from 'mongoose';

/**
 * Single Mongoose connection lifecycle. The URI comes from config (Atlas in
 * production, an in-memory server in tests). Repositories never call connect
 * themselves; the server entrypoint and the test setup own it.
 */
export async function connectDb(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
