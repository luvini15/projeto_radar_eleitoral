import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Database, Info, LoaderCircle, Map, MapPin, TrendingUp } from 'lucide-react'
import { useCampaign, useCampaignData } from '@/lib/campaignContext'

type Position = [number, number]
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: Position[][] | Position[][][] }
type GeoFeature = { type: 'Feature'; geometry: Geometry; properties: { codarea?: string; ra_cira?: number; ra_nome?: string; ra_codigo?: string } }
type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] }
type MetricKey = 'posts' | 'interactions' | 'comments' | 'plays'
type GeoPoint = { post_id: number; latitude: number; longitude: number; location_name?: string | null; observed_interactions?: number | null; comments?: number | null; plays?: number | null }
type GeographyData = {
  coverage: { posts_considered: number; posts_with_location_tag: number; posts_with_coordinates: number }
  methodology: { source: string; location_meaning: string }
  points: GeoPoint[]
}
type Region = { code: string; name: string; shortName?: string; feature: GeoFeature; posts: number; interactions: number | null; comments: number | null; plays: number | null }

const STATES: Record<string, { name: string; uf: string }> = {
  '11': { name: 'Rondônia', uf: 'RO' }, '12': { name: 'Acre', uf: 'AC' }, '13': { name: 'Amazonas', uf: 'AM' },
  '14': { name: 'Roraima', uf: 'RR' }, '15': { name: 'Pará', uf: 'PA' }, '16': { name: 'Amapá', uf: 'AP' },
  '17': { name: 'Tocantins', uf: 'TO' }, '21': { name: 'Maranhão', uf: 'MA' }, '22': { name: 'Piauí', uf: 'PI' },
  '23': { name: 'Ceará', uf: 'CE' }, '24': { name: 'Rio Grande do Norte', uf: 'RN' }, '25': { name: 'Paraíba', uf: 'PB' },
  '26': { name: 'Pernambuco', uf: 'PE' }, '27': { name: 'Alagoas', uf: 'AL' }, '28': { name: 'Sergipe', uf: 'SE' },
  '29': { name: 'Bahia', uf: 'BA' }, '31': { name: 'Minas Gerais', uf: 'MG' }, '32': { name: 'Espírito Santo', uf: 'ES' },
  '33': { name: 'Rio de Janeiro', uf: 'RJ' }, '35': { name: 'São Paulo', uf: 'SP' }, '41': { name: 'Paraná', uf: 'PR' },
  '42': { name: 'Santa Catarina', uf: 'SC' }, '43': { name: 'Rio Grande do Sul', uf: 'RS' },
  '50': { name: 'Mato Grosso do Sul', uf: 'MS' }, '51': { name: 'Mato Grosso', uf: 'MT' },
  '52': { name: 'Goiás', uf: 'GO' }, '53': { name: 'Distrito Federal', uf: 'DF' },
}
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const METRICS: Record<MetricKey, { label: string; shortLabel: string; format: (value: number) => string }> = {
  posts: { label: 'Publicações geolocalizadas', shortLabel: 'Posts', format: value => `${value} post${value === 1 ? '' : 's'}` },
  interactions: { label: 'Média de interações observadas', shortLabel: 'Interações', format: value => number.format(value) },
  comments: { label: 'Total de comentários', shortLabel: 'Comentários', format: value => number.format(value) },
  plays: { label: 'Total de reproduções', shortLabel: 'Reproduções', format: value => number.format(value) },
}
const WIDTH = 820, HEIGHT = 570, PAD = 28
const COLORS = ['#32140c', '#642414', '#9d361b', '#d94a20', '#ff7b3f']
const DF_REGIONS_URL = 'https://onda.ibram.df.gov.br/server/rest/services/Territorio/Regioes_Administrativas_DF_2025/MapServer/0/query?where=1%3D1&outFields=ra_cira%2Cra_nome%2Cra_codigo&returnGeometry=true&outSR=4326&f=geojson'

function titleCase(value: string) {
  return value.toLocaleLowerCase('pt-BR').replace(/(^|[\s-])\p{L}/gu, letter => letter.toLocaleUpperCase('pt-BR'))
}

function flattenPositions(geometry: Geometry): Position[] {
  return geometry.type === 'Polygon' ? (geometry.coordinates as Position[][]).flat() : (geometry.coordinates as Position[][][]).flat(2)
}
function createProjector(features: GeoFeature[]) {
  const points = features.flatMap(feature => flattenPositions(feature.geometry))
  const x = (lon: number) => lon * Math.PI / 180
  const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
  const xs = points.map(point => x(point[0])), ys = points.map(point => y(point[1]))
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const scale = Math.min((WIDTH - PAD * 2) / (maxX - minX), (HEIGHT - PAD * 2) / (maxY - minY))
  const offsetX = (WIDTH - (maxX - minX) * scale) / 2, offsetY = (HEIGHT - (maxY - minY) * scale) / 2
  return ([lon, lat]: Position) => [offsetX + (x(lon) - minX) * scale, offsetY + (maxY - y(lat)) * scale]
}
function ringPath(ring: Position[], project: (point: Position) => number[]) {
  return `${ring.map((point, index) => `${index ? 'L' : 'M'}${project(point).map(value => value.toFixed(2)).join(',')}`).join(' ')} Z`
}
function geometryPath(geometry: Geometry, project: (point: Position) => number[]) {
  return geometry.type === 'Polygon' ? (geometry.coordinates as Position[][]).map(ring => ringPath(ring, project)).join(' ') : (geometry.coordinates as Position[][][]).flatMap(polygon => polygon.map(ring => ringPath(ring, project))).join(' ')
}
function pointInRing([x, y]: Position, ring: Position[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function pointInPolygon(point: Position, polygon: Position[][]) {
  return pointInRing(point, polygon[0]) && !polygon.slice(1).some(hole => pointInRing(point, hole))
}
function contains(geometry: Geometry, point: Position) {
  return geometry.type === 'Polygon' ? pointInPolygon(point, geometry.coordinates as Position[][]) : (geometry.coordinates as Position[][][]).some(polygon => pointInPolygon(point, polygon))
}
function fillFor(value: number | null, min: number, max: number) {
  if (value === null) return '#171717'
  const ratio = max === min ? .5 : (value - min) / (max - min)
  return COLORS[Math.min(COLORS.length - 1, Math.floor(ratio * COLORS.length))]
}
async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Não foi possível carregar a malha geográfica do IBGE.')
  return response.json() as Promise<T>
}

export default function Geography() {
  const { limit, selected } = useCampaign()
  const geography = useCampaignData<GeographyData>('geography', `limit_per_profile=${Math.max(limit, 25)}`)
  const [metric, setMetric] = useState<MetricKey>('posts')
  const [collection, setCollection] = useState<FeatureCollection | null>(null)
  const [microNames, setMicroNames] = useState<Record<string, string>>({})
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const [shapeError, setShapeError] = useState('')
  const [loadingShapes, setLoadingShapes] = useState(true)
  const requestRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController(), requestId = ++requestRef.current
    setLoadingShapes(true); setShapeError(''); setActiveCode(null)
    void (async () => {
      try {
        if (!selectedState) {
          const data = await getJson<FeatureCollection>('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF', controller.signal)
          if (requestId === requestRef.current) setCollection(data)
        } else if (selectedState === '53') {
          const shape = await getJson<FeatureCollection>(DF_REGIONS_URL, controller.signal)
          const normalized = shape.features.map(feature => ({
            ...feature,
            properties: { ...feature.properties, codarea: `53${String(feature.properties.ra_cira).padStart(2, '0')}` },
          }))
          if (requestId === requestRef.current) {
            setCollection({ ...shape, features: normalized })
            setMicroNames(Object.fromEntries(normalized.map(feature => [feature.properties.codarea as string, titleCase(feature.properties.ra_nome || feature.properties.ra_codigo || 'Região administrativa')])))
          }
        } else {
          const [shape, names] = await Promise.all([
            getJson<FeatureCollection>(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${selectedState}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=microrregiao`, controller.signal),
            getJson<{ id: number; nome: string }[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/microrregioes`, controller.signal),
          ])
          if (requestId === requestRef.current) { setCollection(shape); setMicroNames(Object.fromEntries(names.map(item => [String(item.id), item.nome]))) }
        }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === 'AbortError') && requestId === requestRef.current) setShapeError(cause instanceof Error ? cause.message : 'Falha ao carregar o mapa.')
      } finally { if (requestId === requestRef.current) setLoadingShapes(false) }
    })()
    return () => controller.abort()
  }, [selectedState])

  const regions = useMemo<Region[]>(() => {
    if (!collection) return []
    return collection.features.map(feature => {
      const code = feature.properties.codarea as string, state = STATES[code.slice(0, 2)]
      const points = (geography.data?.points || []).filter(item => contains(feature.geometry, [item.longitude, item.latitude]))
      const available = (field: 'observed_interactions' | 'comments' | 'plays') => points.map(point => point[field]).filter((value): value is number => value !== null && value !== undefined)
      const interactions = available('observed_interactions'), comments = available('comments'), plays = available('plays')
      return { code, feature, posts: points.length, name: selectedState ? microNames[code] || `Microrregião ${code}` : state?.name || `Estado ${code}`, shortName: selectedState ? undefined : state?.uf, interactions: interactions.length ? interactions.reduce((sum, value) => sum + value, 0) / interactions.length : null, comments: comments.length ? comments.reduce((sum, value) => sum + value, 0) : null, plays: plays.length ? plays.reduce((sum, value) => sum + value, 0) : null }
    })
  }, [collection, geography.data, microNames, selectedState])

  const valueOf = (region: Region) => metric === 'posts' ? (region.posts || null) : region[metric]
  const values = regions.map(valueOf).filter((value): value is number => value !== null)
  const extent = { min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 0 }
  const ranking = [...regions].filter(region => valueOf(region) !== null).sort((a, b) => (valueOf(b) || 0) - (valueOf(a) || 0))
  const project = useMemo(() => collection?.features.length ? createProjector(collection.features) : null, [collection])
  const active = regions.find(region => region.code === activeCode) || null
  const definition = METRICS[metric], coverage = geography.data?.coverage
  const assigned = regions.reduce((sum, region) => sum + region.posts, 0)

  function chooseRegion(region: Region) { if (!selectedState) setSelectedState(region.code.slice(0, 2)); else setActiveCode(region.code) }

  return <section className="geo-page px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
    <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-[#ff6a2b]"><MapPin className="h-3.5 w-3.5" />Inteligência territorial</div><h1 className="text-3xl font-medium tracking-[-.04em] text-white sm:text-4xl">Desempenho por região</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Posts reais do Instagram cruzados com estados, microrregiões do IBGE e Regiões Administrativas do DF.</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Métrica exibida">{(Object.keys(METRICS) as MetricKey[]).map(key => <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-full border px-3.5 py-2 text-xs transition ${metric === key ? 'border-[#ff6a2b]/70 bg-[#ff5a1f]/15 text-white' : 'border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20'}`}>{METRICS[key].shortLabel}</button>)}</div>
    </header>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">{[['Posts analisados', coverage?.posts_considered], ['Com local marcado', coverage?.posts_with_location_tag], ['Com coordenadas', coverage?.posts_with_coordinates]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"><p className="text-[10px] uppercase tracking-[.12em] text-white/30">{label}</p><p className="mt-1 text-xl text-white/80">{selected && !geography.data && !geography.error ? '…' : value ?? 0}</p></div>)}</div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff5a1f]/20 bg-[#ff5a1f]/[0.055] px-4 py-3 text-xs text-white/55"><span className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0 text-[#ff6a2b]" />O território é o local marcado pelo autor no post; não é a localização da audiência.</span><span className="font-mono text-[9px] uppercase tracking-[.13em] text-white/35">Instagram público · Apify · IBGE · GDF/IBRAM</span></div>
    {geography.error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200/80">{geography.error}</div>}
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090909] shadow-2xl shadow-black/30">
        <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4"><div className="flex items-center gap-3">{selectedState ? <button type="button" onClick={() => setSelectedState(null)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/50 hover:text-white" aria-label="Voltar ao mapa do Brasil"><ArrowLeft className="h-4 w-4" /></button> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff5a1f]/10 text-[#ff6a2b]"><Map className="h-4 w-4" /></span>}<div><p className="text-sm font-medium text-white">{selectedState ? `${STATES[selectedState]?.name} · ${selectedState === '53' ? 'regiões administrativas' : 'microrregiões'}` : 'Brasil · estados'}</p><p className="mt-1 text-[10px] text-white/35">{definition.label}</p></div></div><div className="font-mono text-[9px] uppercase tracking-[.12em] text-white/35">{assigned} posts localizados nesta visão</div></div>
        <div className="relative min-h-[570px] p-2 sm:p-5">
          {loadingShapes ? <div className="grid h-[570px] place-items-center text-sm text-white/45"><span className="flex items-center gap-3"><LoaderCircle className="h-4 w-4 animate-spin text-[#ff5a1f]" />Carregando limites do IBGE…</span></div> : shapeError ? <div role="alert" className="grid h-[570px] place-items-center text-sm text-white/65">{shapeError}</div> : project ? <>
            <svg className="h-auto w-full max-h-[570px]" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de ${selectedState ? STATES[selectedState]?.name : 'Brasil'} por ${definition.label.toLowerCase()}`} onMouseLeave={() => setActiveCode(null)}>{regions.map(region => { const value = valueOf(region), isActive = activeCode === region.code; return <path key={region.code} d={geometryPath(region.feature.geometry, project)} fill={fillFor(value, extent.min, extent.max)} fillRule="evenodd" stroke={isActive ? '#ffb18c' : '#050505'} strokeWidth={isActive ? 2.2 : selectedState ? .7 : 1.3} vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={`${region.name}: ${value === null ? 'sem dados' : definition.format(value)}${selectedState ? '' : '. Abrir microrregiões.'}`} className="cursor-pointer outline-none transition-opacity hover:opacity-90 focus:opacity-90" onMouseEnter={() => setActiveCode(region.code)} onFocus={() => setActiveCode(region.code)} onClick={() => chooseRegion(region)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseRegion(region) } }} /> })}</svg>
            <div aria-live="polite" className={`pointer-events-none absolute bottom-6 left-6 z-10 min-w-[220px] rounded-xl border border-white/12 bg-black/90 p-4 shadow-2xl backdrop-blur transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#ff6a2b]">{active?.shortName || (selectedState === '53' ? 'Região administrativa' : selectedState ? 'Microrregião' : 'Estado')}</p><p className="mt-1 text-sm font-medium text-white">{active?.name}</p><p className="mt-3 text-2xl text-white">{active && valueOf(active) !== null ? definition.format(valueOf(active) as number) : 'Sem dados'}</p><p className="mt-1 text-[10px] text-white/35">{active?.posts || 0} post(s) geolocalizado(s)</p></div>
          </> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] px-5 py-4"><div className="flex items-center gap-2"><span className="mr-1 text-[10px] text-white/30">Sem dados</span><span className="h-2.5 w-8 rounded-sm bg-[#171717]" />{COLORS.map(color => <span key={color} className="h-2.5 w-8 rounded-sm" style={{ background: color }} />)}</div><div className="text-[10px] text-white/35">{values.length ? `${definition.format(extent.min)} — ${definition.format(extent.max)}` : 'Nenhum post geolocalizado'}</div></div>
      </div>
      <aside className="flex flex-col rounded-2xl border border-white/[0.09] bg-[#090909]"><div className="border-b border-white/[0.07] p-5"><div className="flex items-center gap-2 text-sm font-medium text-white"><TrendingUp className="h-4 w-4 text-[#ff6a2b]" />Ranking territorial</div><p className="mt-2 text-xs leading-5 text-white/35">Somente regiões com dados reais para a métrica escolhida.</p></div><ol className="thin-scrollbar max-h-[610px] flex-1 overflow-y-auto p-3">{ranking.length ? ranking.map((region, index) => <li key={region.code}><button type="button" onMouseEnter={() => setActiveCode(region.code)} onFocus={() => setActiveCode(region.code)} onClick={() => chooseRegion(region)} className="group grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-3 text-left hover:bg-white/[0.04]"><span className="font-mono text-[10px] text-white/25">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><strong className="block truncate text-xs font-medium text-white/70 group-hover:text-white">{region.name}</strong><small className="mt-1 block text-[9px] uppercase tracking-[.1em] text-white/25">{region.posts} post(s)</small></span><span className="font-mono text-xs text-white/60">{definition.format(valueOf(region) as number)}</span></button></li>) : <li className="grid min-h-56 place-items-center px-6 text-center"><div><Database className="mx-auto h-5 w-5 text-white/20" /><p className="mt-3 text-sm text-white/50">Nenhum post com coordenadas nesta visão.</p><p className="mt-2 text-xs leading-5 text-white/30">Sincronize perfis que publiquem com localização marcada.</p></div></li>}</ol></aside>
    </div>
  </section>
}
