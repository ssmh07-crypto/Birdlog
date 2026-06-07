export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function dataUrlSize(dataUrl) {
  const base64 = dataUrl.split(',')[1] || ''
  return Math.round((base64.length * 3) / 4)
}

export function compressImage(file, maxSize = 1280, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height))
      const width = Math.round(image.width * ratio)
      const height = Math.round(image.height * ratio)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      canvas.width = width
      canvas.height = height
      context.drawImage(image, 0, 0, width, height)

      const imageData = canvas.toDataURL('image/jpeg', quality)
      URL.revokeObjectURL(imageUrl)

      resolve({
        imageData,
        originalSize: file.size,
        compressedSize: dataUrlSize(imageData),
        width,
        height,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error('이미지를 읽을 수 없어요. 다른 사진을 선택해 주세요.'))
    }

    image.src = imageUrl
  })
}
