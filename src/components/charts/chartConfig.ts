export const chartColors=['#ff6a2b','#e5c49e','#b5bdc9','#86b5ab','#b6a6c7']
export const chartAxis={tick:{fill:'#a1a1aa',fontSize:11},axisLine:false as const,tickLine:false as const,minTickGap:24}
export const compactNumber=(value:number)=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(value)
