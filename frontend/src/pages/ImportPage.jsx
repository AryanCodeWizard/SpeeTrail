import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useState } from 'react'

const SEVERITY_COLORS = {
  error:   'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200'
}

export default function ImportPage() {
  const { groupId } = useParams()

  const [file,      setFile]      = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(null)

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setPreview(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post(
        `/import/${groupId}/analyze`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setPreview(res.data)
      setSessionId(res.data.importSessionId)
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!window.confirm(
      `Import ${preview.summary.cleanRows + preview.summary.warningRows} rows? ` +
      `${preview.summary.errorRows} error rows will be skipped.`
    )) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post(
        `/import/${groupId}/approve/${sessionId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setDone(res.data)
      setPreview(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    try {
      await api.post(`/import/${groupId}/reject/${sessionId}`)
      setPreview(null)
      setSessionId(null)
      setFile(null)
    } catch {
      setError('Failed to reject import')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to={`/groups/${groupId}`} className="hover:text-gray-700 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to group
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Import CSV</h1>
            <p className="text-gray-500 mt-1 text-sm">Upload expense data from any CSV file — we'll guide you through the process.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-start gap-3" role="alert">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Done state */}
        {done && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Import complete</h2>
            <p className="text-green-700 text-sm mb-2">{done.expensesCreated} expenses imported successfully.</p>
            <Link
              to={`/groups/${groupId}`}
              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View expenses
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Upload form */}
        {!preview && !done && (
          <form onSubmit={handleAnalyze} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-3">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload your CSV file</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                The app will analyze the structure, detect anomalies, and show a preview before importing.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                onChange={e => setFile(e.target.files[0])}
                className="hidden"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer block"
              >
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to select or drag and drop'}
                </span>
                <span className="text-xs text-gray-400 block mt-1">CSV files only</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze file'
              )}
            </button>
          </form>
        )}

        {/* Preview — approval screen */}
        {preview && (
          <div className="space-y-6">

            {/* Summary banner */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h2 className="text-base font-semibold text-gray-800">Analysis summary</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total rows',   value: preview.summary.totalRows,   color: 'text-gray-700', bg: 'bg-gray-50' },
                  { label: 'Clean',        value: preview.summary.cleanRows,   color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Warnings',     value: preview.summary.warningRows, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Errors',       value: preview.summary.errorRows,   color: 'text-red-500', bg: 'bg-red-50' }
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-lg p-3 text-center`}>
                    <p className={`text-2xl sm:text-3xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Row-by-row preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <h2 className="text-base font-semibold text-gray-800">Row details</h2>
                </div>
                <span className="text-xs text-gray-400">{preview.rows.length} rows</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {preview.rows.map(row => (
                  <div
                    key={row.rowNumber}
                    className={`
                      border rounded-lg p-3 text-xs transition-all
                      ${row.status === 'error' ? 'border-red-200 bg-red-50/50'
                      : row.status === 'warning' ? 'border-yellow-200 bg-yellow-50/50'
                      : 'border-green-200 bg-green-50/50'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-medium text-gray-800 text-sm">
                        Row {row.rowNumber} — {row.description || 'Untitled expense'}
                      </span>
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-[10px] font-medium
                        ${row.status === 'error' ? 'bg-red-100 text-red-700'
                        : row.status === 'warning' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'}
                      `}>
                        {row.status}
                      </span>
                    </div>

                    <div className="text-gray-600 text-xs mb-2 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {row.date ? new Date(row.date).toLocaleDateString('en-IN') : 'No date'}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {row.payer || 'Unknown'}
                      </span>
                      <span>·</span>
                      <span className="font-mono">
                        {row.currency !== 'INR'
                          ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                          : `₹${row.amountInr}`}
                      </span>
                    </div>

                    {row.anomalies.map((a, i) => (
                      <div
                        key={i}
                        className={`mt-1.5 p-2 rounded border text-xs ${
                          SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info
                        }`}
                      >
                        <span className="font-medium text-xs">{a.type}: </span>
                        {a.detail}
                        <br />
                        <span className="text-xs opacity-80">→ {a.suggestedAction}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Approve / Reject buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
              <button
                onClick={handleReject}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Reject — import nothing
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  `Approve — import ${
                    preview.summary.cleanRows + preview.summary.warningRows
                  } rows`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}