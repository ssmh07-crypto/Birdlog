const STORAGE_KEY = 'birdlog.records.v1'

export function getRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function addRecord(record) {
  const records = getRecords()
  const nextRecords = [record, ...records]
  saveRecords(nextRecords)
  return nextRecords
}

export function deleteRecord(recordId) {
  const nextRecords = getRecords().filter((record) => record.id !== recordId)
  saveRecords(nextRecords)
  return nextRecords
}

export function groupRecordsByBird(records) {
  return records.reduce((groups, record) => {
    const existing = groups.get(record.birdId)
    if (!existing) {
      groups.set(record.birdId, {
        birdId: record.birdId,
        birdName: record.birdName,
        scientificName: record.scientificName,
        count: 1,
        records: [record],
        latestRecord: record,
      })
      return groups
    }

    const recordsForBird = [...existing.records, record].sort(
      (a, b) => new Date(b.discoveredAt) - new Date(a.discoveredAt),
    )

    groups.set(record.birdId, {
      ...existing,
      count: existing.count + 1,
      records: recordsForBird,
      latestRecord: recordsForBird[0],
    })

    return groups
  }, new Map())
}

export function getGroupedBirds(records) {
  return Array.from(groupRecordsByBird(records).values()).sort(
    (a, b) => new Date(b.latestRecord.discoveredAt) - new Date(a.latestRecord.discoveredAt),
  )
}
