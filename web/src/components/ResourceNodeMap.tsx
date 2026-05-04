import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ResourceNodeMapData } from '../lib/types'

const MAP_BOUNDS: L.LatLngBoundsExpression = [[-4096, 0], [0, 4096]]

const CDN_BASE = import.meta.env.VITE_ICON_BASE || '/icons'

const MAP_IMAGES: Record<string, string> = {
  base: `${CDN_BASE}/map-cloud-mist.jpg`,
  dlc: `${CDN_BASE}/map-shifting-sands.jpg`,
}

const CATEGORY_COLORS: Record<string, string> = {
  deposit: '#e8c96a', // warm gold — small ore rocks
  vein:    '#c47c3c', // deep amber — large mineral veins
}

interface Props {
  data: ResourceNodeMapData[]
  compact?: boolean
}

export default function ResourceNodeMap({ data, compact }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Determine primary map type (prefer whichever has more nodes)
  const mapType = data.reduce((best, d) => {
    const bestCount = data.filter(x => x.map === best).reduce((s, x) => s + x.nodes.length, 0)
    const thisCount = data.filter(x => x.map === d.map).reduce((s, x) => s + x.nodes.length, 0)
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
      const color = CATEGORY_COLORS[group.category] ?? '#e8c96a'
      const label = group.category === 'vein' ? 'Mineral Vein' : 'Ore Deposit'
      for (const pt of group.nodes) {
        allPts.push(L.latLng(pt.lat, pt.lon))
        L.circleMarker([pt.lat, pt.lon], {
          radius: compact ? 2 : 4,
          color: '#1a1008',
          fillColor: color,
          fillOpacity: 0.85,
          weight: 1,
          opacity: 0.6,
        }).bindTooltip(label, { direction: 'top', offset: [0, -4] }).addTo(map)
      }
    }

    if (allPts.length > 0) {
      const nodeBounds = L.latLngBounds(allPts)
      const padLat = Math.max((nodeBounds.getNorth() - nodeBounds.getSouth()) * 0.15, 80)
      const padLng = Math.max((nodeBounds.getEast() - nodeBounds.getWest()) * 0.15, 80)
      const paddedBounds = L.latLngBounds(
        [nodeBounds.getSouth() - padLat, nodeBounds.getWest() - padLng],
        [nodeBounds.getNorth() + padLat, nodeBounds.getEast() + padLng],
      )
      const baseZoom = map.getZoom()
      const maxStep = compact ? 0.5 : 1
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

  // Legend: show category counts for the active map
  const activeGroups = data.filter(d => d.map === mapType)
  const totalNodes = activeGroups.reduce((s, d) => s + d.nodes.length, 0)
  const hasVeins = activeGroups.some(d => d.category === 'vein')
  const hasDeposits = activeGroups.some(d => d.category === 'deposit')

  return (
    <div className={compact ? '' : 'mb-4'}>
      <div
        ref={containerRef}
        className="w-full bg-panel"
        style={{ aspectRatio: compact ? '1 / 1' : '4 / 3', maxHeight: compact ? undefined : 600, cursor: 'default' }}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
        {hasDeposits && (
          <div className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS.deposit }} />
            <span className="text-text">Ore Deposit</span>
          </div>
        )}
        {hasVeins && (
          <div className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS.vein }} />
            <span className="text-text">Mineral Vein</span>
          </div>
        )}
        <span className="text-[10px] text-text-mute tabular-nums ml-auto">{totalNodes} locations</span>
      </div>
    </div>
  )
}
