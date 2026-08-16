import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(_error: Error, _info: { componentStack: string }) {
    console.error('Dashboard error:', _error, _info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">⚠️</div>
          <div className="error-boundary-title">Something went wrong</div>
          <div className="error-boundary-body">{this.state.error?.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}
