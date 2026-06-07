export const birds = [
  {
    id: 'sparrow',
    name: '참새',
    scientificName: 'Passer montanus',
    category: '참새과',
    size: '약 14cm',
    description: '도심과 농촌에서 흔히 볼 수 있는 작은 새입니다.',
    features: ['갈색 머리와 등', '볼에 검은 점', '짧고 굵은 부리'],
    habitat: '도심, 농경지, 공원, 마을 주변',
    food: '씨앗, 곡물, 작은 곤충',
    season: '연중 관찰 가능',
    similarSpecies: [
      {
        name: '섬참새',
        difference: '서식 지역과 색 차이로 구분할 수 있습니다.',
      },
    ],
    tips: '볼의 검은 점과 작은 몸집을 확인하면 구분하기 쉽습니다.',
    regionTags: ['urban', 'park', 'farmland'],
    seasonTags: ['spring', 'summer', 'autumn', 'winter'],
    habitatTags: ['urban', 'park', 'farmland'],
  },
  {
    id: 'brown-eared-bulbul',
    name: '직박구리',
    scientificName: 'Hypsipetes amaurotis',
    category: '직박구리과',
    size: '약 27cm',
    description: '회갈색 몸과 큰 울음소리가 특징인 활발한 새입니다.',
    features: ['회갈색 몸', '뺨 주변의 갈색 무늬', '길고 날렵한 꼬리'],
    habitat: '공원, 숲 가장자리, 정원, 도심 녹지',
    food: '열매, 꽃꿀, 곤충',
    season: '연중 관찰 가능',
    similarSpecies: [
      {
        name: '검은이마직박구리',
        difference: '머리와 얼굴의 어두운 무늬 범위를 비교합니다.',
      },
    ],
    tips: '울음소리가 크고 반복적이며, 열매가 있는 나무 주변에서 자주 보입니다.',
    regionTags: ['urban', 'forest-edge', 'park'],
    seasonTags: ['spring', 'summer', 'autumn', 'winter'],
    habitatTags: ['park', 'garden', 'forest-edge'],
  },
  {
    id: 'great-tit',
    name: '박새',
    scientificName: 'Parus major',
    category: '박새과',
    size: '약 14cm',
    description: '검은 머리와 흰 뺨, 노란빛 배가 눈에 띄는 작은 새입니다.',
    features: ['검은 머리', '흰 뺨', '가슴 중앙의 검은 세로줄'],
    habitat: '숲, 공원, 정원, 산림 가장자리',
    food: '곤충, 애벌레, 씨앗',
    season: '연중 관찰 가능',
    similarSpecies: [
      {
        name: '쇠박새',
        difference: '배 색과 가슴의 검은 줄 유무를 확인합니다.',
      },
    ],
    tips: '흰 뺨과 배 중앙의 검은 줄을 함께 보면 동정이 쉽습니다.',
    regionTags: ['park', 'forest', 'garden'],
    seasonTags: ['spring', 'summer', 'autumn', 'winter'],
    habitatTags: ['forest', 'park', 'garden'],
  },
  {
    id: 'magpie',
    name: '까치',
    scientificName: 'Pica serica',
    category: '까마귀과',
    size: '약 45cm',
    description: '검은색과 흰색 대비, 긴 꼬리가 뚜렷한 큰 새입니다.',
    features: ['검은 머리와 등', '흰 배와 날개 부분', '긴 꼬리'],
    habitat: '도심, 농경지, 공원, 숲 가장자리',
    food: '곤충, 열매, 씨앗, 작은 동물',
    season: '연중 관찰 가능',
    similarSpecies: [
      {
        name: '까마귀',
        difference: '까치는 흰색 부위와 긴 꼬리가 뚜렷합니다.',
      },
    ],
    tips: '멀리서도 흰색 날개 무늬와 긴 꼬리 실루엣을 확인하세요.',
    regionTags: ['urban', 'farmland', 'park'],
    seasonTags: ['spring', 'summer', 'autumn', 'winter'],
    habitatTags: ['urban', 'farmland', 'forest-edge'],
  },
  {
    id: 'oriental-turtle-dove',
    name: '멧비둘기',
    scientificName: 'Streptopelia orientalis',
    category: '비둘기과',
    size: '약 33cm',
    description: '목의 줄무늬와 부드러운 갈색 몸빛이 특징인 비둘기류입니다.',
    features: ['갈색 몸', '목 옆의 줄무늬 반점', '둥근 몸집'],
    habitat: '숲, 농경지, 공원, 마을 주변',
    food: '씨앗, 곡물, 작은 열매',
    season: '연중 관찰 가능',
    similarSpecies: [
      {
        name: '집비둘기',
        difference: '멧비둘기는 목의 줄무늬와 갈색 비늘무늬가 더 뚜렷합니다.',
      },
    ],
    tips: '목 옆 줄무늬와 날개 덮깃의 비늘 같은 패턴을 확인하세요.',
    regionTags: ['forest', 'farmland', 'park'],
    seasonTags: ['spring', 'summer', 'autumn', 'winter'],
    habitatTags: ['forest', 'farmland', 'park'],
  },
]

export const sampleCandidates = [
  { birdId: 'sparrow', confidence: 0.91 },
  { birdId: 'brown-eared-bulbul', confidence: 0.78 },
  { birdId: 'great-tit', confidence: 0.64 },
]

export function getBirdById(id) {
  return birds.find((bird) => bird.id === id)
}
