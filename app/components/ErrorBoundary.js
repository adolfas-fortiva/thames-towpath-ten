'use client'
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, margin: 16, color: '#fff' }}>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Tab error — screenshot this</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error?.message || String(this.state.error)}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
