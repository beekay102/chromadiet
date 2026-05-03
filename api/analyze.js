// =============================================================
// api/analyze.js
// Vercel serverless function. Receives food entries (with photos
// and/or text descriptions) and asks Claude Sonnet 4.6 to identify
// foods, estimate portions, and match against the FOOD_DB.
//
// SECURITY: ANTHROPIC_API_KEY is read from environment.
// Locally:    .env.local  (gitignored)
// Production: Vercel project env vars dashboard
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// Workaround: vercel dev sometimes fails to inject env vars into functions.
// Read .env.local directly as a fallback. In production on Vercel.com,
// process.env.ANTHROPIC_API_KEY is set correctly and this fallback never runs.
function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) { /* ignore */ }
  return null;
}

// Mirror of the FOOD_DB ids in ChromaDiet.jsx so the model can
// match recognized foods to your existing reference dataset.
// Keep this in sync with src/ChromaDiet.jsx FOOD_DB.
const FOOD_IDS = [
  'blueberry','blackberry','strawberry','raspberry','cranberry',
  'red_grape','red_wine','orange','grapefruit','lemon','apple','cherry',
  'red_onion','yellow_onion','kale','broccoli','spinach','red_cabbage',
  'tomato','parsley','celery','green_tea','black_tea','dark_chocolate',
  'cocoa','tofu','soymilk','edamame','whole_wheat','oats','brown_rice',
  'salmon','chicken','avocado','olive_oil','walnuts','almonds',
  'pomegranate','eggplant','banana'
];

// Configure Vercel to allow larger request bodies (photos as base64)
export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

const SYSTEM_PROMPT = `You are a clinical dietary analyst helping research participants log a 24-hour food recall. You will be given one or more food entries. For each entry you may receive:
- A photograph of the food/meal
- An optional text description from the participant
- The meal occasion (Breakfast, Lunch, Dinner, Snack)
- An optional portion size in grams (treat as a rough hint only — see Rule 9)

Your job: identify each distinct food in the entry, estimate its portion in grams from visual evidence, and match it to one of the available food reference IDs.

AVAILABLE FOOD REFERENCE IDS (you MUST use one of these exact strings for each match):
${FOOD_IDS.join(', ')}

CRITICAL OUTPUT RULES:
1. Return ONLY valid JSON, no prose, no markdown fences.
2. The JSON must be a single object with shape:
   {
     "entries": [
       {
         "originalEntryId": <number>,
         "matches": [
           {
             "foodId": "<one of the available IDs>",
             "name": "<human-readable name>",
             "portionG": <number>,
             "confidence": <number 0-1>,
             "alternatives": [ {"foodId": "<id>", "name": "<name>", "confidence": <0-1>} ],
             "reasoning": "<one short sentence explaining the match>"
           }
         ],
         "notes": "<optional brief observations about the entry as a whole>"
       }
     ]
   }
3. If the photo shows a composite dish (e.g., a salad with multiple ingredients), produce ONE match per visible ingredient with realistic portion estimates that sum to a sensible total.
4. If you cannot confidently match a food to an available ID, pick the closest one and lower the confidence score; explain in 'reasoning'.
5. If the photo is unclear, missing, or shows nothing food-related, return matches=[] for that entry and explain in 'notes'.
6. NEVER invent foodIds outside the AVAILABLE list. NEVER identify people in photos.
7. Confidence should reflect genuine uncertainty: 0.9+ for clear matches, 0.5-0.8 for plausible matches, <0.5 for guesses.
8. Provide 1-2 alternative matches per food when relevant; empty array if confident.
9. PORTION ESTIMATION — IMPORTANT: When a photo is provided, estimate the portion independently from visual evidence (use scale references like utensils, hands, plates, container size). The participant-supplied portion number is only a rough hint; DISREGARD it if it conflicts with what the photo shows. When no photo is provided, fall back to the participant's text description and stated portion. State scale-reference assumptions in 'reasoning' when relevant (e.g., "estimated using fork in frame as scale reference").`;

export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = loadApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server misconfigured: ANTHROPIC_API_KEY missing.',
      hint: 'Locally: add to .env.local. On Vercel: Settings → Environment Variables.',
    });
  }

  try {
    const { entries } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Request body must include a non-empty entries array.' });
    }

    // Build the message content. For each entry, we add a short text header
    // describing the user-supplied metadata, then the image (if any).
    const userContent = [];
    userContent.push({
      type: 'text',
      text: `The participant submitted ${entries.length} food entr${entries.length === 1 ? 'y' : 'ies'}. Analyze each entry. Return JSON only.`,
    });

    entries.forEach((e, idx) => {
      const headerLines = [
        `\n--- Entry ${idx + 1} (originalEntryId: ${e.id}) ---`,
        `Meal: ${e.meal || 'Unspecified'}`,
        e.portionG && e.portionG > 0
          ? `Participant-supplied portion HINT (rough, may be wrong): ${e.portionG} g/ml total — estimate independently from photo`
          : 'No participant portion provided — estimate purely from photo or description',
        e.description ? `Description: "${e.description}"` : 'Description: none provided',
      ];
      userContent.push({ type: 'text', text: headerLines.join('\n') });

      if (e.photo) {
        // e.photo is a data URL like "data:image/jpeg;base64,..."
        const match = /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/.exec(e.photo);
        if (match) {
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[3],
            },
          });
        } else {
          userContent.push({ type: 'text', text: '(Photo provided but format unrecognized; analyze from description only.)' });
        }
      } else {
        userContent.push({ type: 'text', text: '(No photo provided for this entry — analyze from description only.)' });
      }
    });

    userContent.push({ type: 'text', text: '\nReturn the JSON object now. No prose. No markdown fences. Just JSON.' });

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    // Claude returns content as an array of blocks; we want the text.
    const textBlocks = response.content.filter(b => b.type === 'text').map(b => b.text);
    const rawText = textBlocks.join('\n').trim();

    // Strip any accidental markdown fences just in case
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse failed. Raw text:', cleaned.substring(0, 500));
      return res.status(502).json({
        error: 'Model returned non-JSON response. Try again or simplify the photos.',
        raw: cleaned.substring(0, 1000),
      });
    }

    // Validate that every foodId in the response is in our allowed list.
    // If not, replace with the closest valid alternative or null.
    if (parsed.entries) {
      parsed.entries.forEach(entry => {
        if (Array.isArray(entry.matches)) {
          entry.matches.forEach(m => {
            if (!FOOD_IDS.includes(m.foodId)) {
              m.invalid = true;
              m.originalFoodId = m.foodId;
              m.foodId = null;
            }
            if (Array.isArray(m.alternatives)) {
              m.alternatives = m.alternatives.filter(a => FOOD_IDS.includes(a.foodId));
            }
          });
        }
      });
    }

    return res.status(200).json({
      ...parsed,
      _meta: {
        model: response.model,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    });

  } catch (err) {
    console.error('analyze.js error:', err);
    const status = err?.status || 500;
    return res.status(status).json({
      error: err?.message || 'Unknown error during analysis.',
      type: err?.error?.type || err?.name,
    });
  }
}
