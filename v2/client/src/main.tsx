import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        import('sonner').then(({ toast }) => {
          toast.error(error instanceof Error ? error.message : 'Something went wrong')
        })
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  </StrictMode>,
)
