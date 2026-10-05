'use client'

import { useEffect, useState } from 'react'

/** <img> từ Blob trong IndexedDB, tự thu hồi object URL khi unmount. */
export function BlobImg({ blob, alt = '', className }: { blob: Blob; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? <img src={url} alt={alt} className={className} loading="lazy" decoding="async" draggable={false} /> : null
}
