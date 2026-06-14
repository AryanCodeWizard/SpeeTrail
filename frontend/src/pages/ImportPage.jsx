import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useState } from 'react'

const SEVERITY_COLORS = {
  error:   'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700',
  warning: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-700',
  info:    'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-600'
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Header with gradient back button */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link
                to={`/groups/${groupId}`}
                className="group hover:text-indigo-600 transition-colors flex items-center gap-1 bg-white/50 rounded-full px-3 py-1 shadow-sm hover:shadow"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to group
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
              Import CSV
            </h1>
            <p className="text-gray-500 mt-2 text-sm flex items-center gap-1">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Upload expense data from any CSV file — we'll guide you through the process.
            </p>
          </div>
        </div>

        {/* Error Alert - premium style */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm flex items-start gap-3 shadow-sm" role="alert">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Done state - celebratory card */}
        {done && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-5 shadow-lg animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Import complete!</h2>
            <p className="text-green-700 text-base mb-2 font-bold">{done.expensesCreated} expenses imported successfully.</p>
            <Link
              to={`/groups/${groupId}`}
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-5 py-2.5 rounded-xl shadow-md transition-all"
            >
              View expenses
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Upload form - premium gradient card */}
        {!preview && !done && (
          <form onSubmit={handleAnalyze} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8 transition-all hover:shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-4 shadow-md">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Upload your CSV file</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                We'll analyze the structure, detect anomalies, and show a preview before importing.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all duration-200 group">
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
                <svg className="mx-auto h-14 w-14 text-gray-400 mb-4 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'Click to select or drag and drop'}
                </span>
                <span className="text-xs text-gray-400 block mt-2">CSV files only</span>
              </label>
              {file && (
                <div className="mt-4 text-xs text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full">
                  ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                '🔍 Analyze file'
              )}
            </button>
          </form>
        )}

        {/* Preview — approval screen with enhanced styling */}
        {preview && (
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Summary banner with gradient backgrounds */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Analysis summary</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total rows', value: preview.summary.totalRows, gradient: 'from-gray-500 to-gray-600', bg: 'bg-gray-50' },
                  { label: 'Clean', value: preview.summary.cleanRows, gradient: 'from-green-600 to-emerald-600', bg: 'bg-green-50' },
                  { label: 'Warnings', value: preview.summary.warningRows, gradient: 'from-amber-600 to-orange-600', bg: 'bg-amber-50' },
                  { label: 'Errors', value: preview.summary.errorRows, gradient: 'from-red-600 to-rose-600', bg: 'bg-red-50' }
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center border border-white/60 shadow-sm`}>
                    <p className={`text-2xl sm:text-3xl font-extrabold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Row-by-row preview with better cards */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-gray-800">Row details</h2>
                </div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{preview.rows.length} rows</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {preview.rows.map(row => (
                  <div
                    key={row.rowNumber}
                    className={`
                      rounded-xl border p-4 transition-all hover:shadow-md
                      ${row.status === 'error' ? 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
                      : row.status === 'warning' ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
                      : 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'}
                    `}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          row.status === 'error' ? 'bg-red-500 text-white' : row.status === 'warning' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                        }`}>
                          {row.rowNumber}
                        </div>
                        <span className="font-bold text-gray-800 text-sm">
                          {row.description || 'Untitled expense'}
                        </span>
                      </div>
                      <span className={`
                        px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm
                        ${row.status === 'error' ? 'bg-red-200 text-red-800' 
                        : row.status === 'warning' ? 'bg-amber-200 text-amber-800'
                        : 'bg-green-200 text-green-800'}
                      `}>
                        {row.status}
                      </span>
                    </div>

                    <div className="text-gray-600 text-xs mb-3 flex flex-wrap gap-x-3 gap-y-1 bg-white/50 rounded-lg p-2">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {row.date ? new Date(row.date).toLocaleDateString('en-IN') : 'No date'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {row.payer || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span className="font-mono font-bold">
                        {row.currency !== 'INR'
                          ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                          : `₹${row.amountInr}`}
                      </span>
                    </div>

                    {row.anomalies.map((a, i) => (
                      <div
                        key={i}
                        className={`mt-2 p-2.5 rounded-lg border text-xs ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}
                      >
                        <span className="font-bold text-xs">{a.type}:</span> {a.detail}
                        <div className="mt-1 text-gray-600 text-[11px]">
                          💡 {a.suggestedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Approve / Reject buttons - premium gradient */}
            <div className="flex flex-col sm:flex-row gap-4 sticky bottom-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50">
              <button
                onClick={handleReject}
                className="px-5 py-3 border-2 border-red-200 rounded-xl text-red-600 text-sm font-bold hover:bg-red-50 transition-all duration-200"
              >
                Reject — import nothing
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
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
                  `✅ Approve — import ${
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
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #94a3b8, #64748b);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes zoom-in-95 {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-in {
          animation-duration: 0.25s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fade-in;
        }
        .zoom-in-95 {
          animation-name: zoom-in-95;
        }
      `}</style>
    </div>
  )
}