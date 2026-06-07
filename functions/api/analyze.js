const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const EBIRD_NEARBY_URL = 'https://api.ebird.org/v2/data/obs/geo/recent'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const candidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates', 'notes'],
  properties: {
    notes: {
      type: 'string',
      description: 'Short note about uncertainty, image quality, or location context.',
    },
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'birdId',
          'name',
          'scientificName',
          'category',
          'size',
          'description',
          'features',
          'habitat',
          'food',
          'season',
          'similarSpecies',
          'tips',
          'regionTags',
          'seasonTags',
          'habitatTags',
          'confidence',
          'eBirdSpeciesCode',
        ],
        properties: {
          birdId: { type: 'string' },
          name: { type: 'string' },
          scientificName: { type: 'string' },
          category: { type: 'string' },
          size: { type: 'string' },
          description: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          habitat: { type: 'string' },
          food: { type: 'string' },
          season: { type: 'string' },
          similarSpecies: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'difference'],
              properties: {
                name: { type: 'string' },
                difference: { type: 'string' },
              },
            },
          },
          tips: { type: 'string' },
          regionTags: { type: 'array', items: { type: 'string' } },
          seasonTags: { type: 'array', items: { type: 'string' } },
          habitatTags: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          eBirdSpeciesCode: { type: 'string' },
        },
      },
    },
  },
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractOutputText(responseBody) {
  if (responseBody.output_text) return responseBody.output_text

  return (responseBody.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('')
    .trim()
}

async function fetchNearbyBirds({ env, latitude, longitude }) {
  if (!env.EBIRD_API_KEY || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return []
  }

  const url = new URL(EBIRD_NEARBY_URL)
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lng', String(longitude))
  url.searchParams.set('dist', '50')
  url.searchParams.set('back', '30')
  url.searchParams.set('maxResults', '75')
  url.searchParams.set('sppLocale', 'ko')

  const response = await fetch(url, {
    headers: {
      'X-eBirdApiToken': env.EBIRD_API_KEY,
    },
  })

  if (!response.ok) return []

  const observations = await response.json()
  const bySpecies = new Map()

  for (const observation of observations) {
    if (!bySpecies.has(observation.speciesCode)) {
      bySpecies.set(observation.speciesCode, {
        speciesCode: observation.speciesCode,
        commonName: observation.comName,
        scientificName: observation.sciName,
        locationName: observation.locName,
        observedDate: observation.obsDt,
      })
    }
  }

  return Array.from(bySpecies.values()).slice(0, 40)
}

async function identifyBird({ env, imageData, location, nearbyBirds }) {
  const prompt = [
    'You are BirdLog, a careful bird identification assistant for a global birding app.',
    'Identify likely bird species from the image. Use location and nearby eBird observations as context, but do not force a nearby species if the visual evidence disagrees.',
    'Return Korean display text when possible. Scientific names must be binomial or the closest taxonomic name you can support.',
    'Do not include any commonness, rarity, abundance, or "한국에서의 흔함 정도" field.',
    'If the photo is unclear, lower confidence and explain uncertainty in notes.',
    '',
    `Location: ${JSON.stringify(location)}`,
    `Nearby eBird observations from the last 30 days within 50km: ${JSON.stringify(nearbyBirds)}`,
  ].join('\n')

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageData, detail: 'high' },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'bird_identification_result',
          strict: true,
          schema: candidateSchema,
        },
      },
    }),
  })

  const responseBody = await response.json()
  if (!response.ok) {
    return {
      error: responseBody.error?.message || 'OpenAI Vision request failed.',
      status: response.status,
    }
  }

  const outputText = extractOutputText(responseBody)
  const parsed = JSON.parse(outputText)

  return {
    notes: parsed.notes,
    candidates: parsed.candidates.map((candidate) => ({
      ...candidate,
      birdId: candidate.birdId || candidate.eBirdSpeciesCode || slugify(candidate.scientificName || candidate.name),
    })),
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders })
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context
    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 503)
    }

    const body = await request.json()
    const imageData = body.imageData

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return jsonResponse({ error: 'A compressed image data URL is required.' }, 400)
    }

    const location = {
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      locationText: body.locationText || '',
      locationSource: body.locationSource || 'none',
      observedAt: body.observedAt || new Date().toISOString(),
    }

    const nearbyBirds = await fetchNearbyBirds({
      env,
      latitude: location.latitude,
      longitude: location.longitude,
    })
    const result = await identifyBird({ env, imageData, location, nearbyBirds })

    if (result.error) {
      return jsonResponse({ error: result.error }, result.status || 502)
    }

    return jsonResponse({
      ...result,
      nearbyBirds,
      source: {
        vision: 'openai',
        locationContext: nearbyBirds.length > 0 ? 'ebird' : 'none',
      },
    })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Bird identification failed.' }, 500)
  }
}
