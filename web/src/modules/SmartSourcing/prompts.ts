import type { ClaudeMessage } from '../../lib/api'

// Shared JSON contract Claude is asked to fill in for both the URL/keyword
// and image-upload sourcing flows, so the UI can render one result shape.
const RESPONSE_SHAPE = `{
  "productName": string,
  "priceRangeLow": number,        // USD, low end of 1688/Taobao unit cost
  "priceRangeHigh": number,       // USD, high end of 1688/Taobao unit cost
  "suggestedRetail": number,      // USD suggested US retail price
  "marginPercent": number,        // approximate margin at suggested retail
  "suppliers": [ { "type": string, "moq": string, "notes": string, "authenticity": "verified" | "risk" | "unknown" } ], // List 5-6 distinct supplier options spanning 1688, Taobao, AliExpress, and a Basetao agent — include more than one option per channel where realistic, genuinely spanning different quality/price tiers of the SAME generic (non-branded) product — e.g. a basic-tier and a premium-tier cotton t-shirt supplier, distinguished by real measurable specs (for textiles/apparel: fabric GSM/weight — e.g. "180gsm basic" vs "220gsm heavyweight"; for other categories, the equivalent quality spec such as material grade/thickness). State the relevant spec explicitly in "notes" for each supplier so quality tiers are comparable at a glance — this is about genuine quality/price variation, never about branded replicas or counterfeit tiers of a trademarked product. Sort the list with this strict priority order: (1) genuine, original-factory "verified" suppliers always ranked above "risk" or "unknown" ones — lead with the most authentic, verified-factory source you can identify; (2) within the same authenticity tier, lowest MOQ first, since this dropshipper holds no inventory and strongly prefers 1-unit/no-MOQ suppliers over bulk-only ones. Set "authenticity" strictly: "verified" ONLY for a known/likely genuine manufacturer or a verified (e.g. Gold Supplier) factory-direct source selling the authentic original product — never mark a replica, "1:1", or unverified reseller as "verified"; "risk" for any unverified trading company/reseller where counterfeit or replica risk is plausible (common for branded/trademarked items); "unknown" only when there is truly not enough signal either way. In "notes", briefly explain the authenticity reasoning, and separately call out suppliers generally reputed for low return/complaint rates and high repeat-order rates from real buyers — you have no live return-rate data, so base both judgments on general, well-known supplier-type reputation (factory-direct vs. reseller) rather than fabricated statistics
  "searchKeywordZh": string,      // Specific Chinese search keyword for 1688/Taobao. Include concrete distinguishing details instead of a generic category name — phrase it the way a real seller would title this exact product on 1688/Taobao, so the search surfaces closely matching listings instead of broad, unrelated results. Never output a single generic word (e.g. just "水杯") when the product has any distinguishing details available. For clothing/textile items specifically, always include the fabric/material (e.g. 纯棉 pure cotton, 涤纶 polyester, 羊毛 wool) rather than leaving it out — real listings are titled this way and omitting it returns irrelevant results. Where it fits naturally, include 正品 ("genuine goods" — a real, commonly-used qualifier on Chinese marketplaces) to bias results toward authentic/verified listings over unverified ones — do not use this to search for or bias toward replicas.
  "searchKeywordEn": string       // English keyword with the same level of distinguishing detail as searchKeywordZh (including fabric/material for clothing), for AliExpress and for reference
}`

export function buildTextSourcingMessages(input: string): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: `You are a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent. Always prioritize genuine, original-factory suppliers over unverified or replica-risk ones — never recommend a known replica/counterfeit seller as a top pick. Within genuine suppliers, this dropshipper holds no inventory, so low-MOQ or no-MOQ (single-unit) suppliers are strongly preferred over bulk-only ones. Analyze this product: "${input}".\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
    },
  ]
}

export function buildImageSourcingMessages(base64Data: string, mediaType: string, extraContext?: string): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        {
          type: 'text',
          text: `Identify this product and analyze it as a sourcing assistant for a US dropshipper who buys from Chinese suppliers on 1688/Taobao and fulfills via a Basetao agent. Always prioritize genuine, original-factory suppliers over unverified or replica-risk ones — never recommend a known replica/counterfeit seller as a top pick. Within genuine suppliers, this dropshipper holds no inventory, so low-MOQ or no-MOQ (single-unit) suppliers are strongly preferred over bulk-only ones.${
            extraContext?.trim() ? ` Additional context from the user: ${extraContext.trim()}.` : ''
          }\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n${RESPONSE_SHAPE}`,
        },
      ],
    },
  ]
}

export { parseClaudeJson as parseAnalysis } from '../../lib/parseClaudeJson'
