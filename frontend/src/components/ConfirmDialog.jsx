import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import './ConfirmDialog.css'

const ConfirmContext = createContext(null)

const DEFAULTS = {
  title: 'Подтвердите действие',
  description: '',
  name: '',
  okText: 'Подтвердить',
  cancelText: 'Отмена',
  danger: false,
  icon: null,
}

const DELETE_DEFAULTS = {
  title: 'Удалить запись?',
  description: 'Действие нельзя отменить.',
  okText: 'Удалить',
  cancelText: 'Отмена',
  danger: true,
}

/**
 * Единый диалог подтверждения на всю систему.
 *
 *   const { confirmDelete } = useConfirm()
 *   confirmDelete({ title: 'Удалить блюдо?', name: row.title, onConfirm: () => handleDelete(row.id) })
 *
 * Без onConfirm функция просто возвращает Promise<boolean>:
 *   if (!(await confirm({ title: '...' }))) return
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const resolveRef = useRef(null)
  const cancelBtnRef = useRef(null)

  const close = useCallback((result) => {
    setState(null)
    setLoading(false)
    setError('')
    const resolve = resolveRef.current
    resolveRef.current = null
    if (resolve) resolve(result)
  }, [])

  const confirm = useCallback((options = {}) => {
    // Если предыдущий диалог ещё висит — закрываем его отказом, чтобы промис не завис.
    if (resolveRef.current) resolveRef.current(false)
    resolveRef.current = null
    setLoading(false)
    setError('')
    setState({ ...DEFAULTS, ...options })
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const confirmDelete = useCallback(
    (options = {}) => confirm({ ...DELETE_DEFAULTS, ...options }),
    [confirm],
  )

  const handleCancel = useCallback(() => {
    if (loading) return
    close(false)
  }, [loading, close])

  const handleOk = useCallback(async () => {
    if (loading) return
    const onConfirm = state?.onConfirm
    if (!onConfirm) {
      close(true)
      return
    }
    setError('')
    setLoading(true)
    try {
      await onConfirm()
      close(true)
    } catch (err) {
      setLoading(false)
      setError(err?.message || 'Не удалось выполнить действие')
    }
  }, [loading, state, close])

  // Escape закрывает диалог, фон под ним не скроллится.
  useEffect(() => {
    if (!state) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleCancel()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelBtnRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
    }
  }, [state, handleCancel])

  const danger = state?.danger
  const icon = state?.icon ?? (danger ? <DeleteOutlined /> : <ExclamationCircleFilled />)

  return (
    <ConfirmContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      {state
        && createPortal(
          <div
            className="cfm-backdrop"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleCancel()
            }}
          >
            <div className="cfm-dialog" role="alertdialog" aria-modal="true" aria-label={state.title}>
              <div className={`cfm-icon ${danger ? 'cfm-icon--danger' : 'cfm-icon--primary'}`}>{icon}</div>

              <h3 className="cfm-title">{state.title}</h3>

              {state.description && <p className="cfm-text">{state.description}</p>}
              {state.name && <span className="cfm-name">{state.name}</span>}
              {error && <p className="cfm-error">{error}</p>}

              <div className="cfm-actions">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  className="cfm-btn cfm-btn--ghost"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {state.cancelText}
                </button>
                <button
                  type="button"
                  className={`cfm-btn ${danger ? 'cfm-btn--danger' : 'cfm-btn--primary'}`}
                  onClick={handleOk}
                  disabled={loading}
                >
                  {loading && <span className="cfm-spinner" />}
                  {state.okText}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm должен использоваться внутри <ConfirmProvider>')
  return ctx
}
