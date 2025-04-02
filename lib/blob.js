import { kv } from "@vercel/kv";

export async function saveToBlob(path, data) {
  try {
    console.log(`Saving to KV at key: ${path}, data size: ${JSON.stringify(data).length} bytes`);
    await kv.set(path, data);
    console.log(`Successfully saved to KV at key: ${path}`);
    return { url: `kv:${path}` }; // Mock URL for compatibility
  } catch (err) {
    console.error(`Failed to save to KV at key ${path}: ${err.message}`);
    throw new Error(`Failed to save to KV: ${err.message}`);
  }
}

export async function loadFromBlob(path) {
  try {
    console.log(`Loading from KV at key: ${path}`);
    const data = await kv.get(path);
    if (data === null) {
      console.error(`Data not found in KV at key: ${path}`);
      throw new Error(`Data not found in KV at key: ${path}`);
    }

    console.log(`Successfully loaded from KV at key: ${path}, data size: ${JSON.stringify(data).length} bytes`);
    return data;
  } catch (err) {
    console.error(`Failed to load from KV at key ${path}: ${err.message}`);
    throw new Error(`Failed to load from KV: ${err.message}`);
  }
}

export async function deleteFromBlob(path) {
  try {
    console.log(`Deleting from KV at key: ${path}`);
    await kv.del(path);
    console.log(`Successfully deleted from KV at key: ${path}`);
  } catch (err) {
    console.error(`Failed to delete from KV at key ${path}: ${err.message}`);
    throw new Error(`Failed to delete from KV: ${err.message}`);
  }
}
