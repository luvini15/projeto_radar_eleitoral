import * as React from 'react'
import { apiAssetBlob } from '@/services/radarApi'

export function useProtectedImage(path: string | null) {
  const [url, setUrl] = React.useState<string | null | undefined>(null)
  React.useEffect(() => {
    if (!path) { setUrl(null); return }
    setUrl(null)
    let active = true
    let objectUrl: string | null = null
    apiAssetBlob(path).then(blob => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => { if (active) setUrl(undefined) })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])
  return url
}
