function readString(view, offset, length) {
  let value = ''
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index))
  }
  return value
}

function getUint16(view, offset, littleEndian) {
  return view.getUint16(offset, littleEndian)
}

function getUint32(view, offset, littleEndian) {
  return view.getUint32(offset, littleEndian)
}

function readAsciiValue(view, tiffStart, valueOffset, count, littleEndian) {
  const offset = count <= 4 ? valueOffset : tiffStart + getUint32(view, valueOffset, littleEndian)
  return readString(view, offset, count).replace(/\0/g, '')
}

function readRational(view, offset, littleEndian) {
  const numerator = getUint32(view, offset, littleEndian)
  const denominator = getUint32(view, offset + 4, littleEndian)
  return denominator ? numerator / denominator : 0
}

function readRationalArray(view, tiffStart, valueOffset, count, littleEndian) {
  const offset = tiffStart + getUint32(view, valueOffset, littleEndian)
  return Array.from({ length: count }, (_, index) =>
    readRational(view, offset + index * 8, littleEndian),
  )
}

function toDecimal(values, ref) {
  if (!values || values.length < 3) return null
  const decimal = values[0] + values[1] / 60 + values[2] / 3600
  return ref === 'S' || ref === 'W' ? -decimal : decimal
}

function parseGpsDirectory(view, tiffStart, gpsOffset, littleEndian) {
  const entries = getUint16(view, tiffStart + gpsOffset, littleEndian)
  const gps = {}

  for (let index = 0; index < entries; index += 1) {
    const entryOffset = tiffStart + gpsOffset + 2 + index * 12
    const tag = getUint16(view, entryOffset, littleEndian)
    const type = getUint16(view, entryOffset + 2, littleEndian)
    const count = getUint32(view, entryOffset + 4, littleEndian)
    const valueOffset = entryOffset + 8

    if (tag === 1 && type === 2) gps.latitudeRef = readAsciiValue(view, tiffStart, valueOffset, count, littleEndian)
    if (tag === 2 && type === 5) gps.latitude = readRationalArray(view, tiffStart, valueOffset, count, littleEndian)
    if (tag === 3 && type === 2) gps.longitudeRef = readAsciiValue(view, tiffStart, valueOffset, count, littleEndian)
    if (tag === 4 && type === 5) gps.longitude = readRationalArray(view, tiffStart, valueOffset, count, littleEndian)
  }

  const latitude = toDecimal(gps.latitude, gps.latitudeRef)
  const longitude = toDecimal(gps.longitude, gps.longitudeRef)
  if (latitude === null || longitude === null) return null

  return {
    latitude,
    longitude,
    locationText: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    locationSource: 'exif',
  }
}

function parseExifGps(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  if (view.getUint16(0) !== 0xffd8) return null

  let offset = 2
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset)
    const markerSize = view.getUint16(offset + 2)

    if (marker === 0xffe1 && readString(view, offset + 4, 6) === 'Exif\0\0') {
      const tiffStart = offset + 10
      const byteOrder = readString(view, tiffStart, 2)
      const littleEndian = byteOrder === 'II'
      const firstIfdOffset = getUint32(view, tiffStart + 4, littleEndian)
      const entries = getUint16(view, tiffStart + firstIfdOffset, littleEndian)

      for (let index = 0; index < entries; index += 1) {
        const entryOffset = tiffStart + firstIfdOffset + 2 + index * 12
        const tag = getUint16(view, entryOffset, littleEndian)
        if (tag === 0x8825) {
          const gpsOffset = getUint32(view, entryOffset + 8, littleEndian)
          return parseGpsDirectory(view, tiffStart, gpsOffset, littleEndian)
        }
      }
    }

    offset += 2 + markerSize
  }

  return null
}

export function readExifLocation(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(parseExifGps(reader.result))
      } catch {
        resolve(null)
      }
    }
    reader.onerror = () => resolve(null)
    reader.readAsArrayBuffer(file)
  })
}
