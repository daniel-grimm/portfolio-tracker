import { useParams } from 'react-router-dom'

export function PortfolioDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Portfolio {id}</h1>
      <p className="text-muted-foreground">Coming in Phase 5.</p>
    </div>
  )
}
