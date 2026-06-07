import { getBirdById, sampleCandidates } from '../data/birds'

function normalizeCandidate(candidate) {
  const fallbackId =
    candidate.birdId ||
    candidate.id ||
    candidate.eBirdSpeciesCode ||
    candidate.scientificName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
    crypto.randomUUID()

  return {
    id: fallbackId,
    birdId: fallbackId,
    name: candidate.name || '알 수 없는 새',
    scientificName: candidate.scientificName || 'Scientific name unavailable',
    category: candidate.category || '분류 정보 없음',
    size: candidate.size || '크기 정보 없음',
    description: candidate.description || '아직 상세 설명이 준비되지 않았어요.',
    features: Array.isArray(candidate.features) ? candidate.features : ['사진 특징을 더 확인해야 합니다.'],
    habitat: candidate.habitat || '서식지 정보 없음',
    food: candidate.food || '먹이 정보 없음',
    season: candidate.season || '관찰 시기 정보 없음',
    similarSpecies: Array.isArray(candidate.similarSpecies) ? candidate.similarSpecies : [],
    tips: candidate.tips || '사진이 더 선명하면 동정 정확도가 올라갑니다.',
    regionTags: Array.isArray(candidate.regionTags) ? candidate.regionTags : [],
    seasonTags: Array.isArray(candidate.seasonTags) ? candidate.seasonTags : [],
    habitatTags: Array.isArray(candidate.habitatTags) ? candidate.habitatTags : [],
    confidence: typeof candidate.confidence === 'number' ? candidate.confidence : 0,
    eBirdSpeciesCode: candidate.eBirdSpeciesCode || '',
    source: candidate.source || 'openai',
  }
}

export function getSampleAnalysis() {
  return {
    notes: 'API를 사용할 수 없어 샘플 후보를 표시합니다.',
    source: { vision: 'sample', locationContext: 'none' },
    candidates: sampleCandidates.map((candidate) =>
      normalizeCandidate({ ...getBirdById(candidate.birdId), ...candidate, source: 'sample' }),
    ),
  }
}

export async function analyzeBirdImage({ imageData, locationInfo }) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData,
      latitude: locationInfo?.latitude ?? null,
      longitude: locationInfo?.longitude ?? null,
      locationText: locationInfo?.locationText || '',
      locationSource: locationInfo?.locationSource || 'none',
      observedAt: new Date().toISOString(),
    }),
  })

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('분석 API가 아직 연결되지 않았어요.')
  }

  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.error || '새 동정 API 호출에 실패했어요.')
  }

  return {
    ...body,
    candidates: (body.candidates || []).map(normalizeCandidate),
  }
}
