get-enrich-api
A Vercel-based enrichment API powering cold-email dealership campaigns in the ShowRevv Lead Processing Tools.
Purpose + Architecture
This API provides precision cleaning and enrichment for dealership lead data, optimizing cold outreach campaigns. It supports domain-to-name cleaning, title/location normalization, and franchise group assignment, integrating seamlessly with Google Apps Script via the ShowRevv Lead Processing Tools. The system leverages OpenAI for fallback name cleaning, ensures possessive-friendly ordering, and enforces strict scoring and validation rules for cold-email-safe outputs.
Google Sheets Integration: Uses batchCleanCompanyNames.gs to process lead data in batches, with results written to the main sheet or a ReviewQueue sheet for manual review.

Deployment: Hosted on Vercel, with serverless functions in the api/ directory.

Dependencies: Managed via package.json in the root directory, including openai, winston, and path.

Endpoints
/api/batch-enrich (v5.0.10)
Purpose: Cleans company names from dealership domains, with flexible ordering for [CarBrand]of[City] patterns based on possessive-friendliness (e.g., toyotaofslidell.net → "Slidell Toyota").

Method: POST

Payload Example:
{ "leads": [{ "domain": "smithtowntoyota.com", "rowNum": 1 }, ...] }

Response Example:
{
  "successful": [
{
  "domain": "smithtowntoyota.com",
  "companyName": "Smithtown Toyota",
  "confidenceScore": 125,
  "flags": ["Override"],
  "rowNum": 1,
  "tokens": 0
}
  ],
  "manualReviewQueue": [],
  "fallbackTriggers": [],
  "totalTokens": 0,
  "partial": false,
  "fromFallback": false
}

Notes:
Batch size: 3 (optimized for Google Apps Script integration).

Timeout: 18s (ensures partial results under Vercel paid tier limits).

Normalizes subdomains (e.g., mydealer-mbofstockton.com → mbofstockton).

Requires authentication via VERCEL_AUTH_TOKEN in the Authorization header.

/api/batch-enrich-company-name-fallback (v5.0.10)
Purpose: Fallback for company name cleaning when /batch-enrich fails, using OpenAI for spacing/capitalization fixes (e.g., fletcherauto.com → "Fletcher Auto"). Includes strict validation to prevent hallucination.

Method: POST

Payload: Same as /batch-enrich.

Response Example:
{
  "successful": [
{
  "domain": "fletcherauto.com",
  "companyName": "Fletcher Auto",
  "confidenceScore": 55,
  "flags": ["TokenSplitApplied", "ReviewNeeded"],
  "rowNum": 1,
  "tokens": 0
}
  ],
  "manualReviewQueue": [
{
  "domain": "fletcherauto.com",
  "companyName": "Fletcher Auto",
  "confidenceScore": 55,
  "flags": ["TokenSplitApplied", "ReviewNeeded"],
  "rowNum": 1,
  "tokens": 0
}
  ],
  "fallbackTriggers": [
{
  "domain": "fletcherauto.com",
  "companyName": "Fletcher Auto",
  "confidenceScore": 55,
  "flags": ["TokenSplitApplied", "ReviewNeeded"],
  "rowNum": 1,
  "tokens": 0
}
  ],
  "totalTokens": 0,
  "partial": false,
  "fromFallback": true
}

Notes:
Batch size: 3.

Timeout: 18s.

Normalizes subdomains.

Uses OpenAI (GPT-4-turbo) for spacing/capitalization fixes, with strict constraints to prevent hallucination (e.g., adding "Group" or "Mall").

Requires authentication via VERCEL_AUTH_TOKEN.

/api/batch-clean-titles-and-locations
Purpose: Cleans Job Title, City, and State fields for consistency (e.g., gen. manager → "General Manager", los angeles ca → "Los Angeles").

Method: POST

Payload Example:
[
  { "title": "gen. manager", "city": "los angeles ca", "state": "california", "rowNum": 1 },
  ...
]

Response Example:
{
  "results": [
{ "title": "General Manager", "city": "Los Angeles", "state": "CA", "rowNum": 1 }
  ],
  "partial": false
}

Notes:
Batch size: 3.

Timeout: 18s.

Requires authentication via VERCEL_AUTH_TOKEN.

/api/batch-enrich-franchise (v1.0.0)
Purpose: Assigns Franchise Groups to leads (e.g., "Toyota", "Ford").

Method: POST

Payload Example:
[
  { "domain": "smithtowntoyota.com", "humanName": "Smithtown Toyota", "rowNum": 1 },
  ...
]

Response Example:
{
  "results": [
{ "franchiseGroup": "Toyota", "flags": ["Success"], "rowNum": 1 }
  ],
  "manualReviewQueue": [],
  "partial": false
}

Notes:
Batch size: 3.

Timeout: 18s.

Requires authentication via VERCEL_AUTH_TOKEN.

Scoring + Acceptance Rules
Accepted Names:
Confidence score ≥ 60.

At least 2 words (unless an override or single proper noun like "Tasca").

No flags like TooGeneric, CityNameOnly, PossibleAbbreviation, Skipped, FallbackFailed, or ReviewNeeded.

Rejected Names:
Score < 60 or flagged with ReviewNeeded are moved to manualReviewQueue (for Vercel API responses) or the ReviewQueue sheet (for Google Sheets).

Overrides:
OVERRIDES (e.g., duvalford.com → "Duval Ford") and TEST_CASE_OVERRIDES (e.g., rodbakerford.com → "Rod Baker") always score 125.

Cleanup:
Trailing brands are stripped unless part of a valid phrase (e.g., Devine Ford → "Devine Auto").

Abbreviation expansions applied (e.g., lacitycars.com → "LA City Chevy").

Brand normalization (e.g., "Chevrolet" → "Chevy", "Mercedes-Benz" → "M.B.").

Ordering:
For [CarBrand]of[City] patterns, names are ordered for possessive-friendliness (e.g., toyotaofslidell.net → "Slidell Toyota" because "Slidell's" is more natural than "Toyota's").

Adds PossessiveOrderAdjusted flag when reversed.

Score Guards:
City-only outputs (e.g., athensford.com → "Athens") are capped at 50 with CityOnly and ReviewNeeded flags.

Merged tokens (e.g., fletcherauto.com → "Fletcher Auto") are capped at 55 with TokenSplitApplied and ReviewNeeded flags.

Setup
Clone & Install:
git clone https://github.com/cdearman90/get-enrich-api.git
cd get-enrich-api
npm install
Dependencies are managed via package.json (includes openai, winston, path).

Requires internal utilities in api/lib/ (humanize.js, openai.js).

Set Environment Variables:
In Vercel, go to Settings > Environment Variables:
VERCEL_AUTH_TOKEN: Your Vercel API token for authentication (required for all endpoints).

OPENAI_API_KEY: Your OpenAI API key (used via openai.js for /api/batch-enrich-company-name-fallback).

Deploy:
npm run deploy -- --force
Deploys to Vercel production environment.

--force ensures a fresh deployment, overwriting existing builds.

Usage
Designed for Google Sheets:
Use batchCleanCompanyNames.gs to process lead data in batches of 3.

High-confidence results (score ≥ 60, no ReviewNeeded flag) are written to the main sheet.

Low-confidence or flagged results are moved to the ReviewQueue sheet for manual review.

Logs API calls and OpenAI fallback reasons for transparency.

Manual Testing:
 curl -X POST https://get-enrich-lyjb4qlgg-show-revv.vercel.app/api/batch-enrich 
   -H "Content-Type: application/json" 
   -H "Authorization: Bearer <your-auth-token>" 
   -d '[{ "domain": "smithtowntoyota.com", "rowNum": 1 }]'

System Versioning
Script humanize.js: Version v5.0.10, Updated 2025-04-18

Script batch-enrich.js: Version v5.0.10, Updated 2025-04-18

Script batch-enrich-company-name-fallback.js: Version v5.0.10, Updated 2025-04-18

Script batch-enrich-franchise.js: Version v1.0.0, Updated 2025-04-07

Script batch-clean-titles-and-locations.js: Version v1.0.0, Updated 2025-04-07

Development
Run Locally:
npm run start
Uses vercel dev to simulate the Vercel environment locally.

Node.js Version:
The project uses Node.js 22.x (specified in package.json under "engines": { "node": ">=22" }).

Logging:
Detailed error traces, processing steps, and enhanced fallbackTriggers logging (including brand, city, OpenAI usage) for transparency.

Logs are written to logs/enrich.log using winston.

Notes:
Uses ESM ("type": "module" in package.json).

OPENAI_API_KEY enables GPT-4-turbo via openai.js for /api/batch-enrich-company-name-fallback.

Authentication required for all endpoints using VERCEL_AUTH_TOKEN.

Notes
Optimized for cold-email-safe output (1–3 words, no trailing brands, possessive-friendly ordering).

18s timeout ensures partial results under Vercel paid tier limits.

Integrates with Google Apps Script for dealership-specific outreach, with batch processing limits (300 rows per run) to avoid timeouts.

Normalizes subdomains (e.g., mydealer-mbofstockton.com → mbofstockton) for consistent processing.

OpenAI usage is constrained to spacing/capitalization fixes, with strict validation to prevent hallucination (e.g., adding "Group", "Mall").

Logs include OpenAI fallback reasons (e.g., "Spacing fix applied", "OpenAI failed") for transparency.


