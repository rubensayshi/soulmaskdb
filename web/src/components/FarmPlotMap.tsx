import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FarmPlotMapData } from '../lib/types'

const MAP_BOUNDS: L.LatLngBoundsExpression = [[-4096, 0], [0, 4096]]

const CDN_BASE = import.meta.env.VITE_ICON_BASE || '/icons'

const MAP_IMAGES: Record<string, string> = {
  base: `${CDN_BASE}/map-cloud-mist.jpg`,
  dlc:  `${CDN_BASE}/map-shifting-sands.jpg`,
}

const FARM_COLOR = '#7ec8e3' // light blue (matches spawn map)

interface Props {
  data: FarmPlotMapData[]
  compact?: boolean
}

export default function FarmPlotMap({ data, compact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Prefer the map with more plots
  const mapType = data.reduce((best, d) => {
    const bestCount = data.filter(x => x.map === best).reduce((s, x) => s + x.plots.length, 0)
    const thisCount = data.filter(x => x.map === d.map).reduce((s, x) => s + x.plots.length, 0)
    return thisCount > bestCount ? d.map : best
  }, data[0]?.map ?? 'base')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.1,
      minZoom: -5,
    })

    L.imageOverlay(MAP_IMAGES[mapType] ?? MAP_IMAGES.base, MAP_BOUNDS).addTo(map)
    map.fitBounds(MAP_BOUNDS)

    const allPts: L.LatLng[] = []
    for (const group of data) {
      if (group.map !== mapType) continue
      for (const pt of group.plots) {
        allPts.push(L.latLng(pt.lat, pt.lon))
        const lines: string[] = []
        if (pt.tribe) lines.push(pt.tribe)
        if (pt.other_crops && pt.other_crops.length > 0) {
          lines.push('Also grows: ' + pt.other_crops.join(', '))
        }
        const tooltip = lines.length > 0 ? lines.join('<br/>') : 'Barracks Farm'
        L.circleMarker([pt.lat, pt.lon], {
          radius: compact ? 3 : 5,
          color: '#1a2030',
          fillColor: FARM_COLOR,
          fillOpacity: 0.85,
          weight: 1,
          opacity: 0.7,
        }).bindTooltip(tooltip, { direction: 'top', offset: [0, -4], className: 'farm-tooltip' }).addTo(map)
      }
    }

    if (allPts.length > 0) {
      const nodeBounds = L.latLngBounds(allPts)
      const padLat = Math.max((nodeBounds.getNorth() - nodeBounds.getSouth()) * 0.2, 100)
      const padLng = Math.max((nodeBounds.getEast() - nodeBounds.getWest()) * 0.2, 100)
      const paddedBounds = L.latLngBounds(
        [nodeBounds.getSouth() - padLat, nodeBounds.getWest() - padLng],
        [nodeBounds.getNorth() + padLat, nodeBounds.getEast() + padLng],
      )
      const baseZoom = map.getZoom()
      const maxStep = compact ? 0.5 : 1.5
      let bestZoom = baseZoom
      for (let step = maxStep; step >= 0.1; step -= 0.1) {
        map.setView(nodeBounds.getCenter(), baseZoom + step)
        if (map.getBounds().contains(paddedBounds)) {
          bestZoom = baseZoom + step
          break
        }
      }
      if (bestZoom > baseZoom) {
        map.setView(nodeBounds.getCenter(), bestZoom)
      } else {
        map.fitBounds(MAP_BOUNDS)
      }
    }

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [data, mapType, compact])

  const activeGroup = data.find(d => d.map === mapType)
  const totalPlots = activeGroup?.plots.length ?? 0

  return (
    <div className={compact ? '' : 'mb-4'}>
      <div
        ref={containerRef}
        className="w-full bg-panel"
        style={{ aspectRatio: compact ? '1 / 1' : '4 / 3', maxHeight: compact ? undefined : 600, cursor: 'default' }}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
        <div className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: FARM_COLOR }} />
          <span className="text-text">Barracks Farm Plot</span>
        </div>
        <span className="text-[10px] text-text-mute tabular-nums ml-auto">{totalPlots} locations</span>
      </div>
    </div>
  )
}
