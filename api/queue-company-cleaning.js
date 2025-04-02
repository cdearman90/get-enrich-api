import { saveToBlob } from "../lib/blob.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.error("Method not allowed: Expected POST, got", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const raw = Buffer.concat(buffers).toString("utf-8");
    console.log(`Received raw body: ${raw}`);
    body = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON body: ${err.message}`);
    return res.status(400).json({ error: "Invalid JSON body", details: err.message });
  }

  const { batchId, leads } = body;
  if (!batchId || !Array.isArray(leads) || leads.length === 0) {
    console.error("Missing or invalid batchId or leads:", { batchId, leads });
    return res.status(400).json({ error: "Missing or invalid batchId or leads" });
  }

  // Validate lead structure
  for (const lead of leads) {
    if (!lead.domain || !lead.rowNum) {
      console.error(`Invalid lead structure: ${JSON.stringify(lead)}`);
      return res.status(400).json({ error: "Invalid lead structure: Each lead must have domain and rowNum" });
    }
  }

  try {
    console.log(`Saving batch ${batchId} with ${leads.length} leads to blob`);
    const result = await saveToBlob(`jobs/${batchId}.json`, { leads });
    console.log(`Successfully queued batch ${batchId}, blob URL: ${result.url}`);
    return res.status(200).json({ status: "queued", batchId, count: leads.length });
  } catch (err) {
    console.error(`Failed to save batch ${batchId} to blob: ${err.message}`);
    return res.status(500).json({ error: "Failed to queue batch", details: err.message });
  }
}
