import { useState, useCallback, useEffect } from 'react'
import { useRosterStore } from '../lib/store'
import type { ProcessResult } from '../lib/types'

type OpenFn = typeof import('@tauri-apps/plugin-dialog').open
type InvokeFn = typeof import('@tauri-apps/api/core').invoke

export function CapturePanel() {
  const [files, setFiles] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [tauriApi, setTauriApi] = useState<{ open: OpenFn; invoke: InvokeFn } | null>(null)
  const { addProcessResult } = useRosterStore()

  useEffect(() => {
    Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/api/core'),
    ]).then(([dialogMod, coreMod]) => {
      setTauriApi({ open: dialogMod.open, invoke: coreMod.invoke })
    }).catch(() => {})
  }, [])

  const handleImport = useCallback(async () => {
    if (!tauriApi) return
    const selected = await tauriApi.open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp'] }],
    })
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected]
      setFiles(paths)
    }
  }, [tauriApi])

  const handleProcess = useCallback(async () => {
    if (!files.length || !tauriApi) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await tauriApi.invoke<ProcessResult>('process_images', { paths: files })
      setResult(res)
      addProcessResult(res)
    } catch (e) {
      setResult({ tribesmen: [], cards_found: 0, error: String(e) })
    } finally {
      setProcessing(false)
    }
  }, [files, addProcessResult, tauriApi])

  const handleCapture = useCallback(async () => {
    if (!tauriApi) return
    setProcessing(true)
    setResult(null)
    try {
      const path = await tauriApi.invoke<string>('capture_screen_cmd')
      setFiles([path])
      const res = await tauriApi.invoke<ProcessResult>('process_images', { paths: [path] })
      setResult(res)
      addProcessResult(res)
    } catch (e) {
      setResult({ tribesmen: [], cards_found: 0, error: String(e) })
    } finally {
      setProcessing(false)
    }
  }, [addProcessResult, tauriApi])

  const lowConf = result?.tribesmen.filter(t =>
    t.traits.some(tr => tr.confidence < 0.8)
  ).length ?? 0

  return (
    <div className="mb-6 p-4 bg-panel rounded-lg border border-green/20">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleImport}
          disabled={!tauriApi}
          className="px-4 py-2 bg-tile hover:bg-green/20 border border-green/30 rounded text-sm text-text transition-colors disabled:opacity-50"
        >
          Import screenshots
        </button>
        <button
          onClick={handleCapture}
          disabled={!tauriApi}
          className="px-4 py-2 bg-green/20 hover:bg-green/30 border border-green/40 rounded text-sm text-green font-medium transition-colors disabled:opacity-50"
        >
          Capture screen
        </button>
        {files.length > 0 && (
          <>
            <span className="text-text-dim text-sm">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 bg-green/20 hover:bg-green/30 border border-green/40 rounded text-sm text-green font-medium transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Process'}
            </button>
          </>
        )}
        {!tauriApi && (
          <span className="text-text-dim text-xs">
            (Running outside Tauri — import/capture disabled)
          </span>
        )}
      </div>

      {processing && (
        <div className="mt-3 text-text-dim text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green/40 border-t-green rounded-full animate-spin" />
          Analyzing screenshots...
        </div>
      )}

      {result && !processing && (
        <div className="mt-3 text-sm">
          {result.error ? (
            <div className="text-danger">{result.error}</div>
          ) : (
            <div className="text-text-dim">
              Found {result.cards_found} cards, {result.tribesmen.length} tribesmen parsed.
              {lowConf > 0 && (
                <span className="text-gold ml-2">
                  {lowConf} with low-confidence matches — review recommended.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
