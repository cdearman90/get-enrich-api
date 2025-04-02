import { loadFromBlob } from "../lib/blob.js";

export default async function handler(req, res) {
  const { batchId } = req.query;
  if (!batchId) {
    console.error("Missing batchId in query");
    return res.status(400).json({ error: "Missing batchId" });
  }

  try {
    console.log(`Loading results for batch ${batchId} from blob`);
    const data = await loadFromBlob(`results/${batchId}.json`);
    if (!data || !Array.isArray(data.results)) {
      console.error(`Invalid or missing results for batch ${batchId}`);
      return res.status(404).json({ error: "Results not found or invalid" });
    }

    console.log(`Successfully retrieved ${data.results.length} results for batch ${batchId}`);
    return res.status(200).json({ results: data.results });
  } catch (err) {
    console.error(`Error retrieving results for batch ${batchId}: ${err.message}`);
    return res.status(500).json({ error: "Failed to retrieve results", details: err.message });
  }
}
