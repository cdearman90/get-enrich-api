export default async function handler(req, res) {
  try {
    const leads = req.body;
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: "Invalid request body: leads must be an array" });
    }

    const results = leads.map(lead => {
      const domain = lead.domain.split(".")[0];
      // Remove common suffixes and car brands
      let name = domain
        .replace(/(ford|auto|chevrolet|toyota|bmw)/gi, "")
        .replace(/(dealership|motors|sales|group)/gi, "")
        .trim();
      // Capitalize each word
      name = name
        .split(/([a-z])([A-Z])/g)
        .filter(word => word)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return {
        name: name || "Unknown Dealership",
        confidenceScore: 85,
        flags: ["FallbackUsed"],
        rowNum: lead.rowNum
      };
    });

    return res.status(200).json({
      results,
      manualReviewQueue: [],
      totalTokens: 37,
      partial: false
    });
  } catch (err) {
    console.error(`Fallback endpoint error: ${err.message}`);
    return res.status(500).json({ error: "Fallback endpoint failed", details: err.message });
  }
}
