interface TitleBarProps {
  title?: string
  className?: string
}

/**
 * TitleBar Component
 * 
 * Custom title bar for frameless window on macOS.
 * Uses native traffic light controls (via titleBarStyle: 'hiddenInset').
 * Title is positioned with left padding to avoid overlapping native controls.
 * 
 * TODO: Add Windows/Linux support when testing on those platforms is available.
 */
export function TitleBar({ title = 'Cortex', className }: TitleBarProps) {
  return (
    <div
      className={`flex items-center h-8 bg-bg-primary border-b border-border-primary select-none ${className || ''}`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Title with spacing for macOS native traffic light buttons */}
      <div className="flex items-center h-full pl-20">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
      </div>
    </div>
  )
}
