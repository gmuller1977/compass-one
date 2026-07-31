import React from 'react'

type Props = {
  icon: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}

export default function EmptyState({ icon, title, description, actionLabel, onAction, compact }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: compact ? '24px 16px' : '48px 24px',
      gap: compact ? 8 : 12,
    }}>
      <div style={{
        fontSize: compact ? 32 : 44,
        lineHeight: 1,
        marginBottom: compact ? 2 : 4,
        filter: 'grayscale(20%)',
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: compact ? 14 : 15,
        fontWeight: 600,
        color: '#0f172a',
        lineHeight: 1.3,
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize: compact ? 12 : 13,
          color: '#64748b',
          lineHeight: 1.6,
          maxWidth: 280,
        }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: compact ? 6 : 10,
            padding: compact ? '7px 18px' : '9px 22px',
            background: 'linear-gradient(135deg,#1a56db,#2563eb)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
