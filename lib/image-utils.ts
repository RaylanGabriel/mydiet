async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Resizes and re-encodes a photo as JPEG so large gallery/camera photos
 * (often 5-12 MB, sometimes HEIC) fit storage limits and upload quickly.
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error('Selecione um arquivo de imagem.')
  }

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    throw new Error('Não foi possível ler essa imagem. Tente uma foto em JPG ou PNG.')
  }

  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.round(img.naturalWidth * scale)
  const height = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Não foi possível processar a imagem.')

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}
