export function PageLoader() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-8 text-slate">
      <div className="boxes" aria-label="Carregando dados">
        <div className="box">
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="box">
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="box">
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="box">
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
      <p className="text-sm text-slate">Carregando dados...</p>
    </div>
  )
}
