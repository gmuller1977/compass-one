import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; msg: string; type: ToastType }
type ToastCtx  = { toast: (msg: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

let _id = 0

const CORES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '✓' },
  error:   { bg: '#fff1f2', border: '#fca5a5', text: '#991b1b', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'ℹ' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++_id
    setItems(prev => [...prev, { id, msg, type }])
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 2800)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8,
          alignItems: 'center', pointerEvents: 'none',
        }}>
          {items.map(item => {
            const c = CORES[item.type]
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', borderRadius: 10,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.text, fontSize: 13, fontWeight: 500,
                fontFamily: "-apple-system,'Inter',sans-serif",
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap', pointerEvents: 'auto',
                animation: 'toastIn .18s ease',
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.icon}</span>
                {item.msg}
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </Ctx.Provider>
  )
}
