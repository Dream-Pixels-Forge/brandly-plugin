import { useState, useEffect, useRef } from 'react'
import { getArtifacts, uploadArtifact } from '../api/client'
import type { Project } from '../types'
import type { Artifact } from '../api/client'

interface Props {
  project: Project
  onRefresh: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ArtifactsPage({ project, onRefresh }: Props) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await getArtifacts(project.id)
      setArtifacts(data)
    } catch {
      setArtifacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [project.id])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadArtifact(project.id, file)
      }
      await refresh()
      onRefresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDownload = (name: string) => {
    window.open(`/api/projects/${encodeURIComponent(project.id)}/artifacts/${encodeURIComponent(name)}`, '_blank')
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">📦 Artifacts — {project.name}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-virality">Loading artifacts…</div>
      ) : artifacts.length === 0 ? (
        <div className="card">
          <div className="empty-virality">
            <div className="empty-virality-icon">📦</div>
            <div className="empty-virality-title">No artifacts yet</div>
            <div className="empty-virality-body">
              Upload files or run production phases to generate artifacts.
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{artifacts.length} files</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {artifacts.map((a) => (
              <div key={a.name} className="log-entry" style={{ cursor: 'pointer' }} onClick={() => handleDownload(a.name)}>
                <span className="log-icon">{getIcon(a.name)}</span>
                <div className="log-body">
                  <div className="log-msg">{a.name}</div>
                  <div className="log-time">{formatSize(a.size)} · {new Date(a.ts).toLocaleString()}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDownload(a.name) }}>
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function getIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['mp4', 'webm', 'mov'].includes(ext)) return '🎬'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return '🖼'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
  if (['json'].includes(ext)) return '📄'
  if (['txt', 'md'].includes(ext)) return '📝'
  return '📦'
}
