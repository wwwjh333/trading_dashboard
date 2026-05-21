import { Component } from 'react'
import { useTranslation } from 'react-i18next'

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    const { title, detail, retry, children } = this.props

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-3xl text-accent-red mb-3 select-none">⚠</div>
          <p className="font-medium text-gray-200 mb-1">{title}</p>
          <p className="text-gray-500 text-sm mb-5 max-w-xs leading-relaxed">{detail}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-secondary text-xs"
          >
            {retry}
          </button>
        </div>
      )
    }

    return children
  }
}

export default function ErrorBoundary({ children }) {
  const { t } = useTranslation()
  return (
    <ErrorBoundaryClass
      title={t('common.error')}
      detail={t('common.errorDetail')}
      retry={t('common.retry')}
    >
      {children}
    </ErrorBoundaryClass>
  )
}
