import { useState, useRef } from 'react'
import type { CreateHoldingInput, ImportHoldingsResult } from 'shared'
import { importHoldings } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const BASE = import.meta.env.VITE_API_BASE_URL as string
const TEMPLATE_URL = `${BASE}/api/v1/holdings/import/template`

const EXPECTED_HEADERS = ['Ticker', 'Shares', 'AvgCostBasis', 'PurchaseDate']

type ParsedLot = CreateHoldingInput

type PreviewRow = {
  ticker: string
  totalShares: number
  weightedAvgCostBasis: number
  lotCount: number
}

type Step = 'upload' | 'preview' | 'result'

function parseMDY(val: string): string | null {
  const match = val.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[1]}-${match[2]}`
}

function parseCsv(text: string): { lots: ParsedLot[]; error: string | null } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 1) return { lots: [], error: 'File is empty.' }

  const headers = lines[0].split(',').map((h) => h.trim())
  for (const expected of EXPECTED_HEADERS) {
    if (!headers.includes(expected)) {
      return {
        lots: [],
        error: `Missing or renamed column: "${expected}". Use the VibeFolio template without modifying the headers.`,
      }
    }
  }

  const iCol = (name: string) => headers.indexOf(name)
  const lots: ParsedLot[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(',').map((c) => c.trim())
    const ticker = cols[iCol('Ticker')] ?? ''
    const sharesRaw = cols[iCol('Shares')] ?? ''
    const avgCostBasisRaw = cols[iCol('AvgCostBasis')] ?? ''
    const purchaseDateRaw = cols[iCol('PurchaseDate')] ?? ''

    // Skip silently
    if (!ticker) continue
    if (ticker.toLowerCase() === 'ticker') continue
    const shares = Number(sharesRaw)
    if (!sharesRaw || isNaN(shares) || shares === 0) continue

    // Parse date — error aborts entire import
    const purchaseDate = parseMDY(purchaseDateRaw)
    if (!purchaseDate) {
      return {
        lots: [],
        error: `Row ${i + 1}: unrecognized date format "${purchaseDateRaw}". Expected MM/DD/YYYY.`,
      }
    }

    lots.push({
      ticker,
      shares: sharesRaw,
      avgCostBasis: avgCostBasisRaw || '0',
      purchaseDate,
    })
  }

  return { lots, error: null }
}

function buildPreview(lots: ParsedLot[]): PreviewRow[] {
  const map = new Map<string, { totalShares: number; weightedSum: number; lotCount: number }>()
  for (const lot of lots) {
    const ticker = lot.ticker.toUpperCase()
    const shares = Number(lot.shares)
    const cost = Number(lot.avgCostBasis)
    const existing = map.get(ticker) ?? { totalShares: 0, weightedSum: 0, lotCount: 0 }
    map.set(ticker, {
      totalShares: existing.totalShares + shares,
      weightedSum: existing.weightedSum + shares * cost,
      lotCount: existing.lotCount + 1,
    })
  }
  return Array.from(map.entries()).map(([ticker, { totalShares, weightedSum, lotCount }]) => ({
    ticker,
    totalShares,
    weightedAvgCostBasis: totalShares > 0 ? weightedSum / totalShares : 0,
    lotCount,
  }))
}

type Props = {
  accountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function CsvImportModal({ accountId, open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [parseError, setParseError] = useState<string | null>(null)
  const [lots, setLots] = useState<ParsedLot[]>([])
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ImportHoldingsResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setParseError(null)
    setLots([])
    setPreview([])
    setResult(null)
    setSubmitError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result
      if (typeof text !== 'string') {
        setParseError('Could not read file.')
        return
      }
      const { lots: parsed, error } = parseCsv(text)
      if (error) {
        setParseError(error)
        setLots([])
        setPreview([])
        return
      }
      if (parsed.length === 0) {
        setParseError('No valid rows found after skipping blanks and headers.')
        setLots([])
        setPreview([])
        return
      }
      setParseError(null)
      setLots(parsed)
      setPreview(buildPreview(parsed))
      setStep('preview')
    }
    reader.onerror = () => setParseError('Failed to read file.')
    reader.readAsText(file)
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await importHoldings(accountId, lots)
      setResult(res)
      setStep('result')
      onImported()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Holdings from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the VibeFolio template, fill it in with your holdings, then upload it here.
              Delete the sample row before uploading.
            </p>
            <a
              href={TEMPLATE_URL}
              download
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Download CSV template
            </a>
            <div className="space-y-1">
              <label
                htmlFor="csv-file-input"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Upload completed CSV
              </label>
              <input
                id="csv-file-input"
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:text-sm file:font-medium file:bg-background file:text-foreground hover:file:bg-accent cursor-pointer"
              />
            </div>
            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the import below ({lots.length} lot{lots.length !== 1 ? 's' : ''} across{' '}
              {preview.length} ticker{preview.length !== 1 ? 's' : ''}). Click{' '}
              <strong>Confirm Import</strong> to proceed.
            </p>
            <div className="rounded-md border text-sm max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Total Shares</TableHead>
                    <TableHead>Wtd Avg Cost</TableHead>
                    <TableHead>Lots</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row) => (
                    <TableRow key={row.ticker}>
                      <TableCell className="font-medium">{row.ticker}</TableCell>
                      <TableCell>{row.totalShares.toLocaleString()}</TableCell>
                      <TableCell>${row.weightedAvgCostBasis.toFixed(2)}</TableCell>
                      <TableCell>{row.lotCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Warning: Re-uploading the same file will create duplicate holdings. Make sure you have
              not already imported this file.
            </p>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { reset() }}>
                Back
              </Button>
              <Button onClick={() => void handleConfirm()} disabled={isSubmitting}>
                {isSubmitting ? 'Importing…' : 'Confirm Import'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <p className="text-sm">
              Successfully imported <strong>{result.imported}</strong> holding
              {result.imported !== 1 ? 's' : ''}.
            </p>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
