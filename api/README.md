get-enrich-api
A Vercel-based enrichment API powering cold-email dealership campaigns in the ShowRevv Lead Processing Tools.

Purpose + Architecture
This API provides precision-cleaning and enrichment for dealership lead data, optimizing cold outreach campaigns. It supports domain-to-name cleaning, title/location normalization, and franchise group assignment, integrating seamlessly with Google Apps Script via the ShowRevv Lead Processing Tools.
Google Sheets (batchCleanCompanyNames.gs)
   /api/batch-enrich (v4.0)              Cleans company names
   /api/batch-enrich-company-name-fallback (v1.0.8) Fallback cleaning
   /api/batch-clean-titles-and-locations Normalizes Job Title, City, State
   /api/batch-enrich-franchise (v1.0.0)  Assigns Franchise Group
   
Endpoints

/batch-clean-titles-and-locations endpoint: Cleans Job Title, City, and State fields. Method is POST. Payload example: [{ "title": "gen. manager", "city": "los angeles ca", "state": "california", "rowNum": 1 }, ...]. Response example: { "results": [{ "title": "General Manager", "city": "Los Angeles", "state": "CA", "rowNum": 1 }], "partial": false }. Notes: Batch size of 5, 18s timeout.

/batch-enrich (v4.0) endpoint: Cleans company names from dealership domains. Method is POST. Payload example: [{ "domain": "smithtowntoyota.com", "rowNum": 1 }, ...]. Response example: { "results": [{ "name": "Smithtown Toyota", "confidenceScore": 100, "flags": ["OverrideApplied"], "rowNum": 1, "tokens": 0 }], "manualReviewQueue": [], "totalTokens": 0, "fallbackTriggers": [], "partial": false }. Notes: Batch size of 5, 18s timeout.

/batch-enrich-company-name-fallback (v1.0.8) endpoint: Fallback for company name cleaning when /batch-enrich fails. Method is POST. Payload is same as /batch-enrich. Response example: { "results": [{ "name": "Smithtown Toyota", "confidenceScore": 100, "flags": ["OverrideApplied", "FallbackUsed"], "rowNum": 1, "tokens": 0 }], "manualReviewQueue": [], "totalTokens": 0, "partial": false }. Notes: Batch size of 5, 18s timeout.

/batch-enrich-franchise (v1.0.0) endpoint: Assigns Franchise Groups (e.g., Toyota, Ford). Method is POST. Payload example: [{ "domain": "smithtowntoyota.com", "humanName": "Smithtown Toyota", "rowNum": 1 }, ...]. Response example: { "results": [{ "franchiseGroup": "Toyota", "flags": ["Success"], "rowNum": 1 }], "manualReviewQueue": [], "partial": false }. Notes: Batch size of 5, 18s timeout.

Scoring + Acceptance Rules

Accepted Names: ConfidenceScore is 75 or higher, has 2 or more words (unless override), no flags like TooGeneric, CityNameOnly, PossibleAbbreviation, Skipped, FallbackFailed. Rejected Names: Score below 75 or flagged are added to manualReviewQueue or discarded. Overrides: KNOWN_OVERRIDES (e.g., duvalford.com becomes Duval) always score 100. Cleanup: Trailing brands stripped unless part of a valid phrase (e.g., Devine Ford becomes Devine Auto).

Setup

1. Clone & Install: git clone https://github.com/cdearman90/get-enrich-api.git
   cd get-enrich-api
   No external npm dependencies, but requires internal ./lib/humanize.js.

3. Set Environment Variables:
   In Vercel, go to Settings, then Environment Variables:
   OPENAI_API_KEY: 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

4. Deploy:
   vercel deploy --prod

Usage
Designed for automated enrichment in Google Apps Script, processing batches of 5. Test manually:
curl -X POST https://get-enrich-api-git-main-show-revv.vercel.app/api/batch-enrich -H "Content-Type: application/json" -d '[{ "domain": "smithtowntoyota.com", "rowNum": 1 }]'

System Versioning

Script humanize.js: Version N/A, Updated 2025-04-07
Script batch-enrich.js: Version v4.0, Updated 2025-04-07
Script batch-enrich-company-name-fallback.js: Version v1.0.8, Updated 2025-04-07
Script batch-enrich-franchise.js: Version v1.0.0, Updated 2025-04-07

Development
Run Locally: vercel dev
Node.js: 18 or higher required
Logging: Detailed error traces and processing steps for transparency

Development Notes:
Uses ESM ("type": "module" in package.json)
OPENAI_API_KEY enables GPT-4-turbo via humanize.js for /api/batch-enrich

Notes
Optimized for cold-email-safe output (1–3 words, no trailing brands)

18s timeout ensures partial results under Vercel paid tier limits

Integrates with Google Apps Script for dealership-specific outreach

