import { put, get, del } from "@vercel/blob";

export async function saveToBlob(path, data) {
  try {
    console.log(`Saving to blob at path: ${path}`);
    const json = JSON.stringify(data);
    const blob = await put(path, new Blob([json], { type: "application/json" }), { access: "public" });
    console.log(`Successfully saved to blob at path: ${path}, URL: ${blob.url}`);
    return { url: blob.url };
  } catch (err) {
    console.error(`Failed to save to blob at path ${path}: ${err.message}`);
    throw new Error(`Failed to save to blob: ${err.message}`);
  }
}

export async function loadFromBlob(path) {
  try {
    console.log(`Loading from blob at path: ${path}`);
    const blob = await get(path);
    if (!blob) {
      console.error(`Blob not found at path: ${path}`);
      throw new Error(`Blob not found at path: ${path}`);
    }

    const text = await blob.text();
    if (!text) {
      console.error(`Blob is empty at path: ${path}`);
      throw new Error(`Blob is empty at path: ${path}`);
    }

    const data = JSON.parse(text);
    console.log(`Successfully loaded from blob at path: ${path}, data size: ${text.length} bytes`);
    return data;
  } catch (err) {
    console.error(`Failed to load from blob at path ${path}: ${err.message}`);
    throw new Error(`Failed to load from blob: ${err.message}`);
  }
}

export async function deleteFromBlob(path) {
  try {
    console.log(`Deleting blob at path: ${path}`);
    await del(path);
    console.log(`Successfully deleted blob at path: ${path}`);
  } catch (err) {
    console.error(`Failed to delete blob at path ${path}: ${err.message}`);
    throw new Error(`Failed to delete blob: ${err.message}`);
  }
}
