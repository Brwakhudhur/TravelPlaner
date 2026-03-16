import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { body, validationResult } from 'express-validator';

interface CountryRecommendation {
  rank: number;
  country: string;
  capital: string;
  bestMonths: number[];
  matchScore: number;
  highlights: string[];
  activities: string[];
  estimatedBudget: string;
  whyMatch: string;
}

const AI_API_KEY = process.env.AI_API_KEY;
const AI_PROVIDER = (process.env.AI_PROVIDER || 'google').toLowerCase();
const AI_MODEL =
  process.env.AI_MODEL ||
  (AI_PROVIDER === 'google' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
const AI_API_URL =
  process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_API_VERSION = process.env.AI_API_VERSION;
const AI_MAX_TOKENS = Number(process.env.AI_MAX_TOKENS || 4000);

// Log API key configuration on startup
console.log('🔑 AI Configuration:');
console.log(`  Provider: ${AI_PROVIDER}`);
console.log(`  Model: ${AI_MODEL}`);
console.log(
  `  API Key: ${
    AI_API_KEY
      ? `${AI_API_KEY.substring(0, 8)}...${AI_API_KEY.substring(
          AI_API_KEY.length - 4
        )} (length: ${AI_API_KEY.length})`
      : '❌ NOT SET'
  }`
);

// Simple error fallback when AI is not configured
const getEmptyFallback = (): CountryRecommendation[] => {
  return [];
};

const clampScore = (value: any): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 70;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const toStringArray = (value: any, max: number = 6): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v : String(v)))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
};

const normalizeRecommendations = (
  items: any[],
  month: number,
  budget: string
): CountryRecommendation[] => {
  return items
    .slice(0, 9)
    .map((item, idx) => {
      const bestMonths = Array.isArray(item?.bestMonths)
        ? item.bestMonths
            .map((m: any) => Number(m))
            .filter((m: number) => Number.isInteger(m) && m >= 1 && m <= 12)
        : [];

      const highlights = toStringArray(item?.highlights, 6);
      const activities = toStringArray(item?.activities, 10);

      return {
        rank: typeof item?.rank === 'number' ? item.rank : idx + 1,
        country: item?.country || item?.name || 'Unknown destination',
        capital: item?.capital || item?.city || 'Unknown',
        bestMonths: bestMonths.length > 0 ? bestMonths : [month],
        matchScore: clampScore(item?.matchScore),
        highlights:
          highlights.length > 0
            ? highlights
            : ['Great climate', 'Notable landmarks'],
        activities:
          activities.length > 0 ? activities : ['Sightseeing', 'Local cuisine'],
        estimatedBudget:
          typeof item?.estimatedBudget === 'string' && item.estimatedBudget.trim()
            ? item.estimatedBudget
            : budget || 'Varies by location',
        whyMatch:
          typeof item?.whyMatch === 'string' && item.whyMatch.trim()
            ? item.whyMatch
            : 'Good fit based on season, budget, and interests.',
      };
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
};

/**
 * Strip BOM (Byte Order Mark) if present
 */
const stripBom = (s: string): string => s.replace(/^\uFEFF/, '');

/**
 * Escape control characters that appear inside JSON string values.
 * This handles cases where AI providers include literal newlines/tabs in strings.
 */
const escapeControlCharsInStrings = (jsonText: string): string => {
  let out = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }

    // inString === true
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escape = true;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }

    // Escape invalid control chars inside strings
    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      out += '\\r';
      continue;
    }
    if (ch === '\t') {
      out += '\\t';
      continue;
    }

    const code = ch.charCodeAt(0);
    if (code >= 0x00 && code <= 0x1f) {
      out += '\\u' + code.toString(16).padStart(4, '0');
      continue;
    }

    out += ch;
  }

  return out;
};

/**
 * Parse AI response JSON with robust error handling.
 * Since we use structured output formats (responseMimeType for Google, 
 * response_format for OpenAI), the response should already be clean JSON.
 */
const parseRecommendationsJson = (rawContent: string): any => {
  let text = stripBom(rawContent.trim());

  // Remove markdown code fences if present (just in case)
  const fenceMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```\s*([\s\S]*?)\s*```/i);

  if (fenceMatch?.[1]) {
    text = fenceMatch[1].trim();
  }

  // Common cleanup: fix curly quotes and trailing commas
  const cleaned = text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/,\s*([}\]])/g, '$1');

  // Escape control characters that appear inside string values
  const safe = escapeControlCharsInStrings(cleaned);

  return JSON.parse(safe);
};

const buildGoogleAIRequestBody = (
  month: number,
  budget: string,
  interests: string[]
): any => {
  const interestList =
    interests && interests.length > 0 ? interests.join(', ') : 'general travel';

  const prompt = `You are an expert travel planner.

Return ONLY valid JSON matching exactly this schema:
{
  "recommendations": [
    {
      "country": string,
      "capital": string,
      "bestMonths": number[],
      "matchScore": number,
      "highlights": string[],
      "activities": string[],
      "estimatedBudget": string,
      "whyMatch": string
    }
  ]
}

Return 10 destinations ranked for:
- Month: ${month}
- Budget: ${budget}
- Interests: ${interestList}

Rules:
- Match seasons to the month
- matchScore MUST be 70-100
- avoid repetition
- include a mix of regions
- provide up to 10 activities per destination when possible
- whyMatch should be 2-3 concise sentences with specific reasons (season, budget fit, interests, culture, accessibility)
- IMPORTANT: Do NOT put line breaks inside string values (no multi-line strings)
- output JSON only (no prose, no markdown).`;

  return {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: AI_MAX_TOKENS,
      responseMimeType: 'application/json',
    },
  };
};

const buildOpenAIRequestBody = (
  month: number,
  budget: string,
  interests: string[]
): any => {
  const interestList =
    interests && interests.length > 0 ? interests.join(', ') : 'general travel';

  return {
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: AI_MAX_TOKENS,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert travel planner. Respond ONLY with valid JSON and nothing else. The JSON MUST match exactly this schema: {"recommendations":[{ "country": string, "capital": string, "bestMonths": number[], "matchScore": number, "highlights": string[], "activities": string[], "estimatedBudget": string, "whyMatch": string }]}. Return 10 ranked destinations for the given month, budget, and interests. Match seasons to the month, keep matchScore 70-100, avoid repetition, include a mix of regions, provide up to 10 activities per destination when possible, and make whyMatch 2-3 concise sentences with specific reasons (season, budget fit, interests, culture, accessibility).',
      },
      {
        role: 'user',
        content: `Month: ${month}, Budget: ${budget}, Interests: ${interestList}`,
      },
    ],
  };
};

const callAIService = async (
  month: number,
  budget: string,
  interests: string[]
): Promise<CountryRecommendation[]> => {
  if (!AI_API_KEY) {
    console.error('❌ AI_API_KEY is not configured!');
    console.error('   Please set AI_API_KEY in your .env file');
    console.error('   Get a FREE key at: https://aistudio.google.com');
    throw new Error(
      'AI_API_KEY is not configured. Get a FREE key at https://aistudio.google.com and set it in your .env file.'
    );
  }

  // Validate API key format
  if (AI_PROVIDER === 'google' && !AI_API_KEY.startsWith('AIza')) {
    console.error('❌ Invalid Google API key format!');
    console.error(`   Your key starts with: ${AI_API_KEY.substring(0, 8)}...`);
    console.error('   Google API keys should start with "AIza"');
    console.error('   Get a new key at: https://aistudio.google.com/app/apikey');
  }

  let url: string;
  let headers: Record<string, string>;
  let body: any;

  if (AI_PROVIDER === 'google') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;
    headers = {
      'Content-Type': 'application/json',
    };
    body = buildGoogleAIRequestBody(month, budget, interests);
  } else if (AI_PROVIDER === 'azure') {
    if (!AI_API_VERSION || !AI_API_URL) {
      console.error('❌ Azure OpenAI requires AI_API_VERSION and AI_API_URL in .env');
      throw new Error(
        'AI_API_VERSION and AI_API_URL are required when using Azure OpenAI.'
      );
    }
    url = `${AI_API_URL}${
      AI_API_URL.includes('?') ? '&' : '?'
    }api-version=${AI_API_VERSION}`;
    headers = {
      'Content-Type': 'application/json',
      'api-key': AI_API_KEY,
    };
    body = buildOpenAIRequestBody(month, budget, interests);
  } else {
    url = AI_API_URL;
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    };
    body = buildOpenAIRequestBody(month, budget, interests);
  }

  console.log(`🤖 Calling AI service (${AI_PROVIDER}): ${url.split('?')[0]}`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ AI API Error (${response.status}):`, text);

    try {
      const errorData = JSON.parse(text);
      if (errorData?.error?.message) {
        console.error('   Error message:', errorData.error.message);
      }
      if (
        errorData?.error?.code === 400 ||
        errorData?.error?.status === 'INVALID_ARGUMENT'
      ) {
        console.error('   ⚠️  This usually means:');
        console.error('      - Invalid API key format');
        console.error('      - API key is expired or revoked');
        console.error('      - API key has restrictions (check API key settings)');
        console.error(
          '   🔧 Solution: Create a new API key at https://aistudio.google.com/app/apikey'
        );
      }
      if (
        errorData?.error?.code === 404 ||
        errorData?.error?.status === 'NOT_FOUND'
      ) {
        console.error('   ⚠️  Model not found. Check your AI_MODEL in .env');
        console.error(`      Current model: ${AI_MODEL}`);
        console.error('      Try: gemini-1.5-flash-latest or gemini-1.5-pro-latest');
      }
    } catch (e) {
      // Not JSON, just log raw text
    }

    throw new Error(`AI request failed (${response.status}): ${text}`);
  }

  const data: any = await response.json();

  console.log(
    '📦 Raw API response structure:',
    JSON.stringify(data).substring(0, 200)
  );

  let rawContent: string | undefined;

  if (AI_PROVIDER === 'google') {
    // Gemini can return multiple parts; join all text parts
    const parts = data?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      rawContent = parts
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim();
    }

    if (!rawContent) {
      console.error('❌ Failed to extract text from Google response');
      console.error(
        '   Response structure:',
        JSON.stringify(data, null, 2).substring(0, 500)
      );
    }
  } else {
    rawContent = data?.choices?.[0]?.message?.content;
  }

  if (!rawContent || typeof rawContent !== 'string') {
    console.error(
      '❌ AI response missing content. Raw response:',
      JSON.stringify(data).substring(0, 300)
    );
    throw new Error('AI response missing content');
  }

  console.log('📝 Extracted content (first 300 chars):', rawContent.substring(0, 300));

  let parsed: any;
  try {
    parsed = parseRecommendationsJson(rawContent);
  } catch (err) {
    console.error('❌ Failed to parse JSON from AI response');
    console.error('   Raw content length:', rawContent.length);
    console.error('   First 1000 chars:', rawContent.substring(0, 1000));
    console.error('   Last 500 chars:', rawContent.substring(Math.max(0, rawContent.length - 500)));
    console.error('   Parse error:', err instanceof Error ? err.message : String(err));
    throw new Error('AI response was not valid JSON');
  }

  // Accept either:
  // 1) { "recommendations": [...] }
  // 2) [ ... ]  (array root)
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
      : [];

  if (items.length === 0) {
    console.error('❌ AI returned no recommendations');
    console.error('   Parsed structure:', JSON.stringify(parsed).substring(0, 300));
    throw new Error('AI returned no recommendations');
  }

  console.log(`✅ Successfully parsed ${items.length} recommendations`);

  return normalizeRecommendations(items, month, budget);
};

export const aiRecommendationValidation = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('budget').optional().isIn(['budget', 'moderate', 'luxury']).withMessage('Invalid budget'),
  body('interests').isArray().withMessage('Interests must be an array'),
];

export const getAIRecommendations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const { month, budget, interests } = req.body;

    const normalizedInterests = Array.isArray(interests)
      ? interests.map((i: any) => (typeof i === 'string' ? i.trim() : String(i))).filter(Boolean)
      : [];

    const resolvedBudget = budget || 'moderate';

    try {
      const recommendations = await callAIService(month, resolvedBudget, normalizedInterests);

      res.json({
        success: true,
        source: 'ai',
        model: AI_MODEL,
        provider: AI_PROVIDER,
        count: recommendations.length,
        month,
        budget: resolvedBudget,
        interests: normalizedInterests,
        recommendations,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ AI recommendation error:', errorMsg);

      // Optional: return empty fallback instead of 503
      // const fallback = getEmptyFallback();
      // return res.json({ success: true, source: 'fallback', recommendations: fallback });

      res.status(503).json({
        error: errorMsg,
        hint: 'Get a FREE Google AI Studio key at https://aistudio.google.com or set up OpenAI/Azure credentials in .env',
      });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Server error while processing recommendations' });
  }
};