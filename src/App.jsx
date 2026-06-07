import { useMemo, useRef, useState } from 'react'
import './App.css'
import { birds, getBirdById } from './data/birds'
import { analyzeBirdImage, getSampleAnalysis } from './utils/analyze'
import { readExifLocation } from './utils/exifLocation'
import { compressImage, formatBytes } from './utils/imageCompress'
import { requestCurrentLocation } from './utils/location'
import { addRecord, deleteRecord, getGroupedBirds, getRecords } from './utils/storage'

const todayKey = new Date().toDateString()

function formatDate(dateString) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildLocationInfo(location) {
  return (
    location || {
      latitude: null,
      longitude: null,
      locationText: '',
      locationSource: 'none',
    }
  )
}

function App() {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('home')
  const [selectedBirdId, setSelectedBirdId] = useState(null)
  const [records, setRecords] = useState(() => getRecords())
  const [searchText, setSearchText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [locationInfo, setLocationInfo] = useState(null)
  const [manualLocation, setManualLocation] = useState('')
  const [memo, setMemo] = useState('')
  const [candidates, setCandidates] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [notice, setNotice] = useState('')

  const groupedBirds = useMemo(() => getGroupedBirds(records), [records])
  const discoveredSpeciesCount = groupedBirds.length
  const todayCount = records.filter((record) => new Date(record.discoveredAt).toDateString() === todayKey).length
  const collectionRate = Math.round((discoveredSpeciesCount / birds.length) * 100)

  const filteredBirds = groupedBirds.filter((group) => {
    const keyword = searchText.trim().toLowerCase()
    return (
      !keyword ||
      group.birdName.toLowerCase().includes(keyword) ||
      group.scientificName.toLowerCase().includes(keyword)
    )
  })

  async function handleImageSelect(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setNotice('')
    setCandidates([])
    setMemo('')
    setManualLocation('')
    setIsAnalyzing(true)

    try {
      const exifLocation = await readExifLocation(file)
      const compressed = await compressImage(file)
      let nextLocation = exifLocation

      if (!nextLocation) {
        nextLocation = await requestCurrentLocation()
      }

      const finalLocationInfo = buildLocationInfo(nextLocation)
      setLocationInfo(finalLocationInfo)
      setSelectedImage(compressed)
      await delay(1000)

      try {
        const analysis = await analyzeBirdImage({
          imageData: compressed.imageData,
          locationInfo: finalLocationInfo,
        })
        setCandidates(analysis.candidates)
        if (analysis.notes) setNotice(analysis.notes)
      } catch (analysisError) {
        const sampleAnalysis = getSampleAnalysis()
        setCandidates(sampleAnalysis.candidates)
        setNotice(`${analysisError.message} 샘플 후보를 대신 표시합니다.`)
      }
    } catch (error) {
      setNotice(error.message || '사진을 처리하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleSaveCandidate(candidate) {
    if (!selectedImage) return

    const manualText = manualLocation.trim()
    const finalLocation =
      locationInfo?.locationSource === 'none' && manualText
        ? {
            latitude: null,
            longitude: null,
            locationText: manualText,
            locationSource: 'manual',
          }
        : locationInfo

    const record = {
      id: crypto.randomUUID(),
      birdId: candidate.birdId || candidate.id,
      birdName: candidate.name,
      scientificName: candidate.scientificName,
      imageData: selectedImage.imageData,
      discoveredAt: new Date().toISOString(),
      memo: memo.trim(),
      locationText: finalLocation?.locationText || '',
      latitude: finalLocation?.latitude ?? null,
      longitude: finalLocation?.longitude ?? null,
      locationSource: finalLocation?.locationSource || 'none',
    }

    const nextRecords = addRecord(record)
    setRecords(nextRecords)
    setNotice(`${candidate.name} 기록을 도감에 저장했어요.`)
    setActiveTab('library')
    setSelectedBirdId(candidate.birdId || candidate.id)
  }

  function handleDeleteRecord(recordId) {
    if (!window.confirm('이 발견 기록을 삭제할까요?')) return
    const nextRecords = deleteRecord(recordId)
    setRecords(nextRecords)
    if (!nextRecords.some((record) => record.birdId === selectedBirdId)) {
      setSelectedBirdId(null)
      setActiveTab('library')
    }
  }

  function openDetail(birdId) {
    setSelectedBirdId(birdId)
    setActiveTab('detail')
  }

  function goTab(tab) {
    setActiveTab(tab)
    if (tab !== 'detail') setSelectedBirdId(null)
  }

  return (
    <div className="appShell">
      <main className="appMain">
        {notice && <div className="toast">{notice}</div>}
        {activeTab === 'home' && (
          <HomeScreen
            todayCount={todayCount}
            totalCount={records.length}
            speciesCount={discoveredSpeciesCount}
            collectionRate={collectionRate}
            onFind={() => goTab('find')}
            onLibrary={() => goTab('library')}
          />
        )}
        {activeTab === 'find' && (
          <FindScreen
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageSelect={handleImageSelect}
            selectedImage={selectedImage}
            isAnalyzing={isAnalyzing}
            candidates={candidates}
            locationInfo={locationInfo}
            manualLocation={manualLocation}
            setManualLocation={setManualLocation}
            memo={memo}
            setMemo={setMemo}
            onSave={handleSaveCandidate}
          />
        )}
        {activeTab === 'library' && (
          <LibraryScreen
            groupedBirds={filteredBirds}
            totalSpecies={discoveredSpeciesCount}
            totalRecords={records.length}
            searchText={searchText}
            setSearchText={setSearchText}
            onOpenDetail={openDetail}
          />
        )}
        {activeTab === 'detail' && (
          <DetailScreen
            birdId={selectedBirdId}
            groupedBirds={groupedBirds}
            onBack={() => goTab('library')}
            onDeleteRecord={handleDeleteRecord}
          />
        )}
      </main>

      <nav className="bottomNav" aria-label="주요 메뉴">
        <button className={activeTab === 'home' ? 'active' : ''} type="button" onClick={() => goTab('home')}>
          홈
        </button>
        <button className={activeTab === 'find' ? 'active' : ''} type="button" onClick={() => goTab('find')}>
          찾기
        </button>
        <button
          className={activeTab === 'library' || activeTab === 'detail' ? 'active' : ''}
          type="button"
          onClick={() => goTab('library')}
        >
          도감
        </button>
      </nav>
    </div>
  )
}

function HomeScreen({ todayCount, totalCount, speciesCount, collectionRate, onFind, onLibrary }) {
  const badges = [
    { label: '첫 발견', active: totalCount >= 1 },
    { label: '3종 발견', active: speciesCount >= 3 },
    { label: '5회 기록', active: totalCount >= 5 },
  ]

  return (
    <section className="screen">
      <div className="brandBlock">
        <p className="eyebrow">BirdLog</p>
        <h1>오늘의 탐조를 나만의 도감으로</h1>
      </div>

      <div className="statsGrid">
        <Stat label="오늘 발견" value={todayCount} />
        <Stat label="전체 기록" value={totalCount} />
        <Stat label="발견 종" value={speciesCount} />
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <h2>수집률</h2>
          <strong>{collectionRate}%</strong>
        </div>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${collectionRate}%` }} />
        </div>
        <p className="helperText">샘플 새 데이터 {birds.length}종 기준으로 계산돼요.</p>
      </section>

      <section className="panel">
        <h2>배지</h2>
        <div className="badgeRow">
          {badges.map((badge) => (
            <span className={badge.active ? 'badge active' : 'badge'} key={badge.label}>
              {badge.label}
            </span>
          ))}
        </div>
      </section>

      <div className="primaryActions">
        <button className="primaryButton" type="button" onClick={onFind}>
          새 사진으로 찾기
        </button>
        <button className="secondaryButton" type="button" onClick={onLibrary}>
          내 도감 보기
        </button>
      </div>

      <p className="storageNote">도감은 이 브라우저의 localStorage에 저장됩니다. 브라우저 데이터를 삭제하면 도감도 사라져요.</p>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="statCard">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function FindScreen({
  cameraInputRef,
  galleryInputRef,
  onImageSelect,
  selectedImage,
  isAnalyzing,
  candidates,
  locationInfo,
  manualLocation,
  setManualLocation,
  memo,
  setMemo,
  onSave,
}) {
  return (
    <section className="screen">
      <div className="titleRow">
        <div>
          <p className="eyebrow">Find</p>
          <h1>사진으로 새 후보 확인</h1>
        </div>
      </div>

      <div className="captureGrid">
        <button className="primaryButton" type="button" onClick={() => cameraInputRef.current?.click()}>
          촬영하기
        </button>
        <button className="secondaryButton" type="button" onClick={() => galleryInputRef.current?.click()}>
          사진 선택하기
        </button>
        <input ref={cameraInputRef} className="hiddenInput" type="file" accept="image/*" capture="environment" onChange={onImageSelect} />
        <input ref={galleryInputRef} className="hiddenInput" type="file" accept="image/*" onChange={onImageSelect} />
      </div>

      {selectedImage && (
        <section className="panel">
          <img className="previewImage" src={selectedImage.imageData} alt="선택한 새 사진 미리보기" />
          <div className="sizeRow">
            <span>원본 {formatBytes(selectedImage.originalSize)}</span>
            <span>저장 {formatBytes(selectedImage.compressedSize)}</span>
          </div>
          <p className="helperText">긴 변 {Math.max(selectedImage.width, selectedImage.height)}px, JPEG quality 0.7로 저장됩니다.</p>
        </section>
      )}

      {isAnalyzing && <div className="analysisBox">분석 중...</div>}

      {locationInfo?.locationSource === 'none' && selectedImage && (
        <section className="panel">
          <h2>위치 메모</h2>
          <p className="helperText">EXIF GPS와 현재 위치를 가져오지 못했어요. 원하면 직접 위치를 적어 주세요.</p>
          <input value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="예: 서울숲, Central Park" />
        </section>
      )}

      {selectedImage && (
        <section className="panel">
          <h2>개인 메모</h2>
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="관찰한 행동, 장소 느낌, 날씨 등을 적어보세요." />
        </section>
      )}

      {candidates.length > 0 && (
        <section className="candidateList">
          <h2>새 후보</h2>
          {candidates.map((candidate) => (
            <article className="candidateCard" key={candidate.id}>
              <div className="candidateHeader">
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.scientificName}</p>
                </div>
                <strong>{Math.round(candidate.confidence * 100)}%</strong>
              </div>
              <p>{candidate.description}</p>
              <div className="tagRow">
                {[...candidate.seasonTags, ...candidate.habitatTags].slice(0, 5).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <dl className="infoList">
                <div>
                  <dt>분류</dt>
                  <dd>{candidate.category}</dd>
                </div>
                <div>
                  <dt>크기</dt>
                  <dd>{candidate.size}</dd>
                </div>
                <div>
                  <dt>특징</dt>
                  <dd>{candidate.features.join(', ')}</dd>
                </div>
                <div>
                  <dt>서식지</dt>
                  <dd>{candidate.habitat}</dd>
                </div>
                <div>
                  <dt>먹이</dt>
                  <dd>{candidate.food}</dd>
                </div>
                <div>
                  <dt>관찰 시기</dt>
                  <dd>{candidate.season}</dd>
                </div>
                <div>
                  <dt>구분 포인트</dt>
                  <dd>
                    {candidate.similarSpecies.length > 0
                      ? candidate.similarSpecies.map((item) => `${item.name}: ${item.difference}`).join(' ')
                      : '비슷한 새 정보가 아직 충분하지 않아요.'}
                  </dd>
                </div>
                {candidate.eBirdSpeciesCode && (
                  <div>
                    <dt>eBird 코드</dt>
                    <dd>{candidate.eBirdSpeciesCode}</dd>
                  </div>
                )}
              </dl>
              <button className="primaryButton" type="button" onClick={() => onSave(candidate)}>
                이 새로 저장
              </button>
            </article>
          ))}
        </section>
      )}
    </section>
  )
}

function LibraryScreen({ groupedBirds, totalSpecies, totalRecords, searchText, setSearchText, onOpenDetail }) {
  return (
    <section className="screen">
      <div className="titleRow">
        <div>
          <p className="eyebrow">Library</p>
          <h1>내 탐조 도감</h1>
        </div>
      </div>
      <div className="summaryStrip">
        <span>{totalSpecies}종</span>
        <span>{totalRecords}개 기록</span>
      </div>
      <input className="searchInput" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="새 이름 또는 학명 검색" />

      {groupedBirds.length === 0 ? (
        <div className="emptyState">
          <h2>아직 도감이 비어 있어요.</h2>
          <p>찾기 탭에서 사진을 선택하고 샘플 후보를 저장하면 종 단위 카드가 만들어집니다.</p>
        </div>
      ) : (
        <div className="libraryGrid">
          {groupedBirds.map((group) => (
            <button className="birdCard" type="button" key={group.birdId} onClick={() => onOpenDetail(group.birdId)}>
              <img src={group.latestRecord.imageData} alt={`${group.birdName} 대표 사진`} />
              <div>
                <h2>{group.birdName}</h2>
                <p>{group.scientificName}</p>
                <span>{group.count}회 발견</span>
                <small>마지막 발견 {formatDate(group.latestRecord.discoveredAt)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function DetailScreen({ birdId, groupedBirds, onBack, onDeleteRecord }) {
  const group = groupedBirds.find((item) => item.birdId === birdId)
  const bird = getBirdById(birdId)

  if (!group) {
    return (
      <section className="screen">
        <button className="textButton" type="button" onClick={onBack}>
          뒤로가기
        </button>
        <div className="emptyState">선택한 기록을 찾을 수 없어요.</div>
      </section>
    )
  }

  return (
    <section className="screen noteScreen">
      <button className="textButton" type="button" onClick={onBack}>
        뒤로가기
      </button>
      <img className="detailHero" src={group.latestRecord.imageData} alt={`${group.birdName} 대표 사진`} />
      <section className="panel">
        <p className="eyebrow">{bird?.category || 'BirdLog note'}</p>
        <h1>{group.birdName}</h1>
        <p className="scientific">{group.scientificName}</p>
        <strong>{group.count}회 발견</strong>
      </section>

      {bird ? (
        <section className="panel detailInfo">
          <InfoBlock title="크기" value={bird.size} />
          <InfoBlock title="주요 특징" value={bird.features.join(', ')} />
          <InfoBlock title="서식지" value={bird.habitat} />
          <InfoBlock title="먹이" value={bird.food} />
          <InfoBlock title="관찰 시기" value={bird.season} />
          <InfoBlock title="비슷한 새와 구분 포인트" value={bird.similarSpecies.map((item) => `${item.name}: ${item.difference}`).join(' ')} />
          <InfoBlock title="동정 팁" value={bird.tips} />
        </section>
      ) : (
        <section className="panel">아직 상세 정보가 준비되지 않았어요.</section>
      )}

      <section className="recordList">
        <h2>발견 기록</h2>
        {group.records.map((record) => (
          <article className="recordItem" key={record.id}>
            <img src={record.imageData} alt={`${record.birdName} 발견 기록`} />
            <div>
              <strong>{formatDate(record.discoveredAt)}</strong>
              <p>{record.locationText || '위치 정보 없음'} · {record.locationSource}</p>
              {record.memo && <p>{record.memo}</p>}
              <button className="dangerButton" type="button" onClick={() => onDeleteRecord(record.id)}>
                기록 삭제
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  )
}

function InfoBlock({ title, value }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  )
}

export default App
