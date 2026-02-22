import { useParams } from 'react-router-dom'

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Account {id}</h1>
      <p className="text-muted-foreground">Coming in Phase 6.</p>
    </div>
  )
}
