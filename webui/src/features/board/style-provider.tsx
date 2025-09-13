import { createContext, useCallback, useContext, useMemo, useState, type JSX, type ReactNode } from 'react'
import type { Style, LinkStyle, NodeType } from './types/style'
import { createDefaultStyle, createDefaultLinkStyle } from './types/style'

type Ctx = {
  defaultStyle: Style
  setDefaultStyle: (next: Partial<Style>) => void
  defaultLinkStyle: LinkStyle
  setDefaultLinkStyle: (next: Partial<LinkStyle>) => void
  recordNodeStyleChange: (partial: Partial<Style>) => void
  recordLinkStyleChange: (partial: Partial<LinkStyle>) => void
  applyDefaultNodeStyle: (type?: NodeType) => Style
  applyDefaultLinkStyle: () => LinkStyle
}

const StyleDefaultsContext = createContext<Ctx | null>(null)

export function StyleDefaultsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [defaultStyle, _setDefaultStyle] = useState<Style>(() => createDefaultStyle({ type: 'rectangle' }))
  const [defaultLinkStyle, _setDefaultLinkStyle] = useState<LinkStyle>(() => createDefaultLinkStyle())

  const setDefaultStyle = useCallback((next: Partial<Style>): void => {
    _setDefaultStyle(prev => ({ ...prev, ...next }))
  }, [])

  const setDefaultLinkStyle = useCallback((next: Partial<LinkStyle>): void => {
    _setDefaultLinkStyle(prev => ({ ...prev, ...next }))
  }, [])

  const recordNodeStyleChange = useCallback((partial: Partial<Style>): void => {
    setDefaultStyle(partial)
  }, [setDefaultStyle])

  const recordLinkStyleChange = useCallback((partial: Partial<LinkStyle>): void => {
    setDefaultLinkStyle(partial)
  }, [setDefaultLinkStyle])

  const applyDefaultNodeStyle = useCallback((type?: NodeType): Style => {
    const base = createDefaultStyle({ type: type ?? defaultStyle.type })
    const { ...overlay } = defaultStyle
    return { ...base, ...overlay, type: type ?? defaultStyle.type }
  }, [defaultStyle])

  const applyDefaultLinkStyle = useCallback((): LinkStyle => {
    const base = createDefaultLinkStyle()
    return { ...base, ...defaultLinkStyle }
  }, [defaultLinkStyle])

  const value = useMemo<Ctx>(() => ({
    defaultStyle,
    setDefaultStyle,
    defaultLinkStyle,
    setDefaultLinkStyle,
    recordNodeStyleChange,
    recordLinkStyleChange,
    applyDefaultNodeStyle,
    applyDefaultLinkStyle
  }), [
    defaultStyle,
    setDefaultStyle,
    defaultLinkStyle,
    setDefaultLinkStyle,
    recordNodeStyleChange,
    recordLinkStyleChange,
    applyDefaultNodeStyle,
    applyDefaultLinkStyle
  ])

  return (
    <StyleDefaultsContext.Provider value={value}>
      {children}
    </StyleDefaultsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStyleDefaults(): Ctx {
  const ctx = useContext(StyleDefaultsContext)
  if (!ctx) throw new Error('useStyleDefaults must be used within <StyleDefaultsProvider>')
  return ctx
}