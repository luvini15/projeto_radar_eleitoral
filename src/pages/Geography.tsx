import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Info, LoaderCircle, Map, MapPin, TrendingUp } from 'lucide-react'

type Position = [number, number]
type Geometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Position[][] | Position[][][]
}
type GeoFeature = {
  type: 'Feature'
  geometry: Geometry
  properties: { codarea: string }
}
type FeatureCollection = { type: 'FeatureCollection'; features: GeoFeature[] }
type MetricKey = 'performance' | 'reach' | 'engagement' | 'sentiment'

type Region = {
  code: string
  name: string
  shortName?: string
  feature: GeoFeature
  value: number
}

const STATES: Record<string, { name: string; uf: string }> = {
  '11': { name: 'Rondônia', uf: 'RO' }, '12': { name: 'Acre', uf: 'AC' },
  '13': { name: 'Amazonas', uf: 'AM' }, '14': { name: 'Roraima', uf: 'RR' },
  '15': { name: 'Pará', uf: 'PA' }, '16': { name: 'Amapá', uf: 'AP' },
  '17': { name: 'Tocantins', uf: 'TO' }, '21': { name: 'Maranhão', uf: 'MA' },
  '22': { name: 'Piauí', uf: 'PI' }, '23': { name: 'Ceará', uf: 'CE' },
  '24': { name: 'Rio Grande do Norte', uf: 'RN' }, '25': { name: 'Paraíba', uf: 'PB' },
  '26': { name: 'Pernambuco', uf: 'PE' }, '27': { name: 'Alagoas', uf: 'AL' },
  '28': { name: 'Sergipe', uf: 'SE' }, '29': { name: 'Bahia', uf: 'BA' },
  '31': { name: 'Minas Gerais', uf: 'MG' }, '32': { name: 'Espírito Santo', uf: 'ES' },
  '33': { name: 'Rio de Janeiro', uf: 'RJ' }, '35': { name: 'São Paulo', uf: 'SP' },
  '41': { name: 'Paraná', uf: 'PR' }, '42': { name: 'Santa Catarina', uf: 'SC' },
  '43': { name: 'Rio Grande do Sul', uf: 'RS' }, '50': { name: 'Mato Grosso do Sul', uf: 'MS' },
  '51': { name: 'Mato Grosso', uf: 'MT' }, '52': { name: 'Goiás', uf: 'GO' },
  '53': { name: 'Distrito Federal', uf: 'DF' },
}

const METRICS: Record<MetricKey, { label: string; shortLabel: string; format: (value: number) => string }> = {
  performance: { label: 'Índice de desempenho', shortLabel: 'Desempenho', format: value => `${Math.round(value)} pts` },
  reach: { label: 'Alcance estimado', shortLabel: 'Alcance', format: value => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) },
  engagement: { label: 'Taxa de engajamento', shortLabel: 'Engajamento', format: value => `${value.toFixed(1).replace('.', ',')}%` },
  sentiment: { label: 'Sentimento positivo', shortLabel: 'Sentimento', format: value => `${Math.round(value)}%` },
}

const WIDTH = 820
const HEIGHT = 570
const PAD = 28
const COLORS = ['#25110b', '#542013', '#92351d', '#d84b21', '#ff7b3f']

function seededValue(code: string, metric: MetricKey) {
  const seed = [...`${code}-${metric}`].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0)
  const ratio = ((seed * 9301 + 49297) % 233280) / 233280
  if (metric === 'reach') return 28000 + ratio * 1720000
  if (metric === 'engagement') return 1.4 + ratio * 7.3
  if (metric === 'sentiment') return 48 + ratio * 44
  return 41 + ratio * 56
}

function flattenPositions(geometry: Geometry): Position[] {
  if (geometry.type === 'Polygon') return (geometry.coordinates as Position[][]).flat()
  return (geometry.coordinates as Position[][][]).flat(2)
}

function createProjector(features: GeoFeature[]) {
  const points = features.flatMap(feature => flattenPositions(feature.geometry))
  const mercatorX = (lon: number) => (lon * Math.PI) / 180
  const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
  const xs = points.map(point => mercatorX(point[0]))
  const ys = points.map(point => mercatorY(point[1]))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scale = Math.min((WIDTH - PAD * 2) / (maxX - minX), (HEIGHT - PAD * 2) / (maxY - minY))
  const contentWidth = (maxX - minX) * scale
  const contentHeight = (maxY - minY) * scale
  const offsetX = (WIDTH - contentWidth) / 2
  const offsetY = (HEIGHT - contentHeight) / 2
  return ([lon, lat]: Position) => [offsetX + (mercatorX(lon) - minX) * scale, offsetY + (maxY - mercatorY(lat)) * scale]
}

function ringPath(ring: Position[], project: (point: Position) => number[]) {
  return ring.map((point, index) => `${index ? 'L' : 'M'}${project(point).map(value => value.toFixed(2)).join(',')}`).join(' ') + ' Z'
}

function geometryPath(geometry: Geometry, project: (point: Position) => number[]) {
  if (geometry.type === 'Polygon') return (geometry.coordinates as Position[][]).map(ring => ringPath(ring, project)).join(' ')
  return (geometry.coordinates as Position[][][]).flatMap(polygon => polygon.map(ring => ringPath(ring, project))).join(' ')
}

function fillFor(value: number, min: number, max: number) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min)
  return COLORS[Math.min(COLORS.length - 1, Math.floor(ratio * COLORS.length))]
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Não foi possível carregar a malha geográfica.')
  return response.json() as Promise<T>
}

function MapSkeleton() {
  return <div className="grid h-[570px] place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.015]">
    <div className="flex items-center gap-3 text-sm text-white/45"><LoaderCircle className="h-4 w-4 animate-spin text-[#ff5a1f]" />Carregando limites do IBGE…</div>
  </div>
}

export default function Geography() {
  const [metric, setMetric] = useState<MetricKey>('performance')
  const [collection, setCollection] = useState<FeatureCollection | null>(null)
  const [microNames, setMicroNames] = useState<Record<string, string>>({})
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const requestRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestRef.current
    setLoading(true)
    setError('')
    setActiveCode(null)

    async function load() {
      try {
        if (!selectedState) {
          const data = await getJson<FeatureCollection>('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF', controller.signal)
          if (requestId === requestRef.current) setCollection(data)
          return
        }
        const [shape, names] = await Promise.all([
          getJson<FeatureCollection>(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${selectedState}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=microrregiao`, controller.signal),
          getJson<{ id: number; nome: string }[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/microrregioes`, controller.signal),
        ])
        if (requestId === requestRef.current) {
          setCollection(shape)
          setMicroNames(Object.fromEntries(names.map(item => [String(item.id), item.nome])))
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : 'Falha ao carregar o mapa.')
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [selectedState])

  const regions = useMemo<Region[]>(() => {
    if (!collection) return []
    return collection.features.map(feature => {
      const code = feature.properties.codarea
      const state = STATES[code.slice(0, 2)]
      return {
        code,
        name: selectedState ? microNames[code] || `Microrregião ${code}` : state?.name || `Estado ${code}`,
        shortName: selectedState ? undefined : state?.uf,
        feature,
        value: seededValue(code, metric),
      }
    })
  }, [collection, metric, microNames, selectedState])

  const project = useMemo(() => collection?.features.length ? createProjector(collection.features) : null, [collection])
  const extent = useMemo(() => {
    const values = regions.map(region => region.value)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [regions])
  const ranking = useMemo(() => [...regions].sort((a, b) => b.value - a.value), [regions])
  const active = regions.find(region => region.code === activeCode) || null
  const metricDefinition = METRICS[metric]
  const selectedStateName = selectedState ? STATES[selectedState]?.name : null

  function chooseRegion(region: Region) {
    if (!selectedState) setSelectedState(region.code.slice(0, 2))
    else setActiveCode(region.code)
  }

  return <section className="geo-page px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
    <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.18em] text-[#ff6a2b]"><MapPin className="h-3.5 w-3.5" />Inteligência territorial</div>
        <h1 className="text-3xl font-medium tracking-[-.04em] text-white sm:text-4xl">Desempenho por região</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Compare sinais da campanha entre estados e avance até as microrregiões para localizar concentrações e oportunidades.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Métrica exibida">
        {(Object.keys(METRICS) as MetricKey[]).map(key => <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-full border px-3.5 py-2 text-xs transition ${metric === key ? 'border-[#ff6a2b]/70 bg-[#ff5a1f]/15 text-white' : 'border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white/75'}`}>{METRICS[key].shortLabel}</button>)}
      </div>
    </header>

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff5a1f]/20 bg-[#ff5a1f]/[0.055] px-4 py-3 text-xs text-white/55">
      <span className="flex items-center gap-2"><Info className="h-4 w-4 shrink-0 text-[#ff6a2b]" /><strong className="font-medium text-white/80">Modo demonstração:</strong> valores simulados; limites geográficos oficiais do IBGE.</span>
      <span className="font-mono text-[9px] uppercase tracking-[.13em] text-white/35">Base territorial · IBGE</span>
    </div>

    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090909] shadow-2xl shadow-black/30">
        <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            {selectedState ? <button type="button" onClick={() => setSelectedState(null)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white" aria-label="Voltar ao mapa do Brasil"><ArrowLeft className="h-4 w-4" /></button> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff5a1f]/10 text-[#ff6a2b]"><Map className="h-4 w-4" /></span>}
            <div><p className="text-sm font-medium text-white">{selectedStateName ? `${selectedStateName} · microrregiões` : 'Brasil · estados'}</p><p className="mt-1 text-[10px] text-white/35">{metricDefinition.label}</p></div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-[#ff6a2b] shadow-[0_0_10px_#ff5a1f]" />{regions.length} regiões</div>
        </div>

        <div className="relative min-h-[570px] p-2 sm:p-5">
          {loading ? <MapSkeleton /> : error ? <div role="alert" className="grid h-[570px] place-items-center text-center"><div><p className="text-sm text-white/70">{error}</p><button type="button" className="mt-4 rounded-full border border-white/15 px-4 py-2 text-xs text-white/60" onClick={() => setSelectedState(value => value === null ? '35' : null)}>Tentar novamente</button></div></div> : project ? <>
            <svg className="h-auto w-full max-h-[570px]" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Mapa de ${selectedStateName || 'Brasil'} por ${metricDefinition.label.toLowerCase()}`} onMouseLeave={() => setActiveCode(null)}>
              <defs><filter id="geo-glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff5a1f" floodOpacity=".35" /></filter></defs>
              {regions.map(region => {
                const isActive = activeCode === region.code
                return <path key={region.code} d={geometryPath(region.feature.geometry, project)} fill={fillFor(region.value, extent.min, extent.max)} fillRule="evenodd" stroke={isActive ? '#ffb18c' : '#050505'} strokeWidth={isActive ? 2.2 : selectedState ? 0.7 : 1.3} vectorEffect="non-scaling-stroke" filter={isActive ? 'url(#geo-glow)' : undefined} tabIndex={0} role="button" aria-label={`${region.name}: ${metricDefinition.format(region.value)}${selectedState ? '' : '. Abrir microrregiões.'}`} className="cursor-pointer outline-none transition-[opacity,stroke] duration-150 hover:opacity-90 focus:opacity-90" onMouseEnter={() => setActiveCode(region.code)} onFocus={() => setActiveCode(region.code)} onClick={() => chooseRegion(region)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseRegion(region) } }} />
              })}
            </svg>
            <div aria-live="polite" className={`pointer-events-none absolute bottom-6 left-6 z-10 min-w-[210px] rounded-xl border border-white/12 bg-black/90 p-4 shadow-2xl backdrop-blur transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
              <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#ff6a2b]">{active?.shortName || (selectedState ? 'Microrregião' : 'Estado')}</p><p className="mt-1 text-sm font-medium text-white">{active?.name}</p><p className="mt-3 text-2xl font-medium tracking-tight text-white">{active ? metricDefinition.format(active.value) : '—'}</p><p className="mt-1 text-[10px] text-white/35">{selectedState ? 'Clique para manter a seleção' : 'Clique para ver microrregiões'}</p>
            </div>
          </> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2">{COLORS.map((color, index) => <span key={color} className="h-2.5 w-9 rounded-sm" style={{ background: color }} aria-hidden="true" title={`Faixa ${index + 1}`} />)}</div>
          <div className="flex gap-8 text-[10px] text-white/35"><span><b className="mr-1 font-normal text-white/65">Menor</b>{regions.length ? metricDefinition.format(extent.min) : '—'}</span><span><b className="mr-1 font-normal text-white/65">Maior</b>{regions.length ? metricDefinition.format(extent.max) : '—'}</span></div>
        </div>
      </div>

      <aside className="flex flex-col rounded-2xl border border-white/[0.09] bg-[#090909]">
        <div className="border-b border-white/[0.07] p-5"><div className="flex items-center gap-2 text-sm font-medium text-white"><TrendingUp className="h-4 w-4 text-[#ff6a2b]" />Ranking territorial</div><p className="mt-2 text-xs leading-5 text-white/35">Regiões ordenadas por {metricDefinition.label.toLowerCase()}.</p></div>
        <ol className="thin-scrollbar max-h-[610px] flex-1 overflow-y-auto p-3">
          {ranking.map((region, index) => <li key={region.code}><button type="button" onMouseEnter={() => setActiveCode(region.code)} onFocus={() => setActiveCode(region.code)} onClick={() => chooseRegion(region)} className="group grid w-full grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none"><span className="font-mono text-[10px] text-white/25">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><strong className="block truncate text-xs font-medium text-white/70 group-hover:text-white">{region.name}</strong><small className="mt-1 block text-[9px] uppercase tracking-[.1em] text-white/25">{region.shortName || region.code}</small></span><span className="font-mono text-xs text-white/60">{metricDefinition.format(region.value)}</span></button></li>)}
        </ol>
      </aside>
    </div>
  </section>
}
