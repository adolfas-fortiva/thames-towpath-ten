'use client'
import { createContext, useContext, useState, useEffect } from 'react'

export const DARK = {
  name:        'dark',
  bg:          'linear-gradient(160deg, #0c1535 0%, #111e50 50%, #0c1535 100%)',
  bgSolid:     '#0c1535',
  nav:         'rgba(12,21,53,0.97)',
  navBorder:   'rgba(255,255,255,0.08)',
  card:        'rgba(255,255,255,0.06)',
  cardBorder:  'rgba(255,255,255,0.12)',
  sectionHead: 'rgba(255,255,255,0.07)',
  text:        '#ffffff',
  textMuted:   'rgba(255,255,255,0.6)',
  textDim:     'rgba(255,255,255,0.35)',
  textFaint:   'rgba(255,255,255,0.2)',
  divider:     'rgba(255,255,255,0.07)',
  input:       'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.15)',
  tabActive:   '#FECB00',
  tabInactive: 'rgba(255,255,255,0.4)',
}

export const LIGHT = {
  name:        'light',
  bg:          '#f0f2f5',
  bgSolid:     '#f0f2f5',
  nav:         'rgba(255,255,255,0.98)',
  navBorder:   'rgba(0,0,0,0.1)',
  card:        '#ffffff',
  cardBorder:  'rgba(0,0,0,0.1)',
  sectionHead: 'rgba(0,0,0,0.04)',
  text:        '#0f172a',
  textMuted:   'rgba(0,0,0,0.65)',
  textDim:     'rgba(0,0,0,0.45)',
  textFaint:   'rgba(0,0,0,0.25)',
  divider:     'rgba(0,0,0,0.07)',
  input:       'rgba(0,0,0,0.04)',
  inputBorder: 'rgba(0,0,0,0.18)',
  tabActive:   '#1B2869',
  tabInactive: 'rgba(0,0,0,0.45)',
}

export const YELLOW = '#FECB00'
export const NAVY   = '#1B2869'
export const CYAN   = '#00B5E2'

const ThemeContext = createContext(DARK)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DARK)

  useEffect(() => {
    const saved = localStorage.getItem('ttt_theme')
    if (saved === 'light') setTheme(LIGHT)
  }, [])

  const toggle = () => {
    const next = theme.name === 'dark' ? LIGHT : DARK
    setTheme(next)
    localStorage.setItem('ttt_theme', next.name)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
