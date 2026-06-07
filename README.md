# BirdLog

BirdLog는 사용자가 새 사진을 촬영하거나 기존 사진을 업로드한 뒤, OpenAI Vision과 eBird 위치 데이터를 활용해 새 후보를 확인하고 나만의 탐조 도감에 저장하는 React + Vite 기반 모바일 웹 MVP입니다.

## 현재 MVP 범위

- 로그인 없음
- Cloudflare Pages Functions 기반 서버리스 API
- OpenAI Vision 기반 이미지 후보 분석
- eBird API 기반 위치 주변 관찰종 보정
- localStorage 기반 발견 기록 저장
- 도감은 `birdId` 기준으로 중복 없이 종 단위 표시
- 같은 새를 여러 번 저장하면 기록은 누적되지만 도감 카드는 1개만 표시
- 사진 원본은 저장하지 않고, 브라우저에서 압축한 base64 이미지만 저장

## 실행 방법

```bash
npm install
npm run dev
```

프로덕션 빌드는 아래 명령으로 확인할 수 있습니다.

```bash
npm run build
```

Cloudflare Pages Functions까지 로컬에서 확인하려면 빌드 후 Wrangler로 실행합니다.

```bash
npm run build
npx wrangler pages dev dist
```

## 모바일 테스트 방법

1. 개발 서버를 실행합니다.
2. 같은 네트워크의 휴대폰에서 Vite가 출력하는 Network URL로 접속합니다.
3. 찾기 탭에서 `촬영하기`를 누르면 모바일 후면 카메라가 우선 실행됩니다.
4. `사진 선택하기`를 누르면 갤러리 또는 앨범의 기존 사진을 선택할 수 있습니다.

## 사진 처리

- 업로드된 사진은 저장 전에 Canvas API로 리사이즈됩니다.
- 긴 변 기준 최대 1280px 이하로 조정합니다.
- JPEG quality `0.7`로 압축합니다.
- 압축된 base64 이미지만 localStorage에 저장합니다.
- 원본 사진 파일은 저장하지 않습니다.
- EXIF GPS 정보는 압축 전에 먼저 읽습니다.

## 위치 처리

위치는 아래 우선순위로 저장됩니다.

1. 사진 EXIF GPS
2. 브라우저 현재 위치 권한
3. 직접 입력한 위치 메모
4. 위치 없음

각 발견 기록에는 `locationSource`가 `exif`, `currentLocation`, `manual`, `none` 중 하나로 저장됩니다.

## AI 동정 API

`functions/api/analyze.js`는 `/api/analyze` 엔드포인트로 동작합니다.

분석 흐름:

1. 프론트에서 사진을 1280px 이하 JPEG quality `0.7`로 압축
2. EXIF GPS 또는 현재 위치를 함께 `/api/analyze`에 전송
3. Cloudflare Pages Function에서 eBird API로 주변 최근 관찰종 조회
4. OpenAI Responses API의 Vision 입력으로 압축 이미지와 eBird 컨텍스트 전달
5. 구조화된 JSON 후보를 프론트에 반환

Cloudflare Pages 환경변수:

```bash
OPENAI_API_KEY=your_openai_api_key
EBIRD_API_KEY=your_ebird_api_key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL`은 선택값입니다. 설정하지 않으면 `gpt-4.1-mini`를 사용합니다.

로컬 Vite 개발 서버만 사용할 때는 Pages Function이 실행되지 않으므로 샘플 후보가 fallback으로 표시됩니다.

## 도감 저장 방식

localStorage에는 `records` 배열이 저장됩니다. 브라우저 데이터를 삭제하면 BirdLog 도감 데이터도 사라집니다.

도감 목록은 전체 발견 기록 수가 아니라 `birdId` 기준으로 그룹화된 새 종 단위로 표시됩니다. 수집률도 전체 샘플 새 데이터 수 대비 발견한 `birdId` 수로 계산합니다.

## 샘플 후보 fallback

API 키가 없거나 로컬 Vite 서버에서 `/api/analyze`를 사용할 수 없으면 `src/data/birds.js`의 샘플 새 데이터 후보 3개를 대신 표시합니다.

## 추후 확장 방향

1. 글로벌 새 DB 상세 정보 연결
2. Firebase 로그인/클라우드 저장
3. 사용자 사진 백업
4. 위치 기반 후보군 고도화
5. 사용자 검증 데이터를 이용한 커스텀 모델 학습
