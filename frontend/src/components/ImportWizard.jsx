import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STEPS = ['Upload', 'Preview', 'Anomalies', 'Approve', 'Done']

const SEVERITY_STYLE = {
  error:   'bg-gradient-to-r from-rose-900/40 to-red-900/30 border-red-500/30 text-rose-100',
  warning: 'bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/30 text-amber-100',
  info:    'bg-gradient-to-r from-sky-900/20 to-cyan-900/20 border-sky-500/30 text-sky-100'
}

export default function ImportWizard({ groupId, onComplete }) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
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
      setStep(1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post(
        `/import/${groupId}/approve/${sessionId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setResult(res.data)
      setStep(4)
      toast.success('Import complete')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    await api.post(`/import/${groupId}/reject/${sessionId}`)
    setStep(0)
    setFile(null)
    setPreview(null)
    setSessionId(null)
    toast('Import cancelled')
  }

  const anomalyRows = preview?.rows?.filter(r => r.anomalies?.length > 0) || []
  const cleanRows = preview?.rows?.filter(r => r.status === 'clean') || []
  const errorRows = preview?.rows?.filter(r => r.status === 'error') || []

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step indicator - colorful gradient */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center relative">
              <div className={`
                w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-md
                ${i < step
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-300'
                  : i === step
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white ring-2 ring-purple-300 animate-pulse'
                    : 'bg-slate-800 text-slate-400 ring-1 ring-white/10'}
              `}>
                {i < step ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`absolute -bottom-7 text-[10px] sm:text-xs font-semibold whitespace-nowrap hidden sm:block ${
                i <= step ? 'text-emerald-300' : 'text-slate-500'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all duration-500 ${
                i < step ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-slate-800'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Upload - premium design */}
      {step === 0 && (
        <div className="bg-slate-950/90 rounded-2xl border border-white/10 hover:border-indigo-400/40 transition-all duration-300 p-8 sm:p-12 text-center shadow-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-full mb-5 shadow-inner">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Import CSV File</h3>
          <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">
            Upload your expense CSV. We'll analyze and guide you through the import process.
          </p>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              className="hidden"
            />
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl text-sm font-semibold text-slate-100 transition-all shadow-sm hover:shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose CSV file
            </div>
          </label>
          {file && (
            <div className="mt-5 p-3 bg-slate-900/80 rounded-xl inline-block shadow-sm">
              <p className="text-sm text-emerald-300 font-medium">
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
          <div className="mt-7">
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2 mx-auto"
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
                '🔍 Analyze file'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Preview summary - colorful cards */}
      {step === 1 && preview && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total rows', value: preview.summary.totalRows, color: 'from-slate-200 to-slate-100', bg: 'from-slate-800/80 to-slate-900/80' },
              { label: 'Clean', value: preview.summary.cleanRows, color: 'from-emerald-200 to-emerald-100', bg: 'from-slate-900/80 to-slate-950/90' },
              { label: 'Warnings', value: preview.summary.warningRows, color: 'from-amber-200 to-orange-200', bg: 'from-slate-900/80 to-slate-950/90' },
              { label: 'Errors', value: preview.summary.errorRows, color: 'from-rose-200 to-red-200', bg: 'from-slate-900/80 to-slate-950/90' }
            ].map(item => (
              <div key={item.label} className={`bg-gradient-to-br ${item.bg} rounded-xl p-4 text-center border border-white/50 shadow-md`}>
                <p className={`text-3xl font-extrabold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.value}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
            >
              Review anomalies →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Anomaly detail */}
      {step === 2 && preview && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs shadow">
                {anomalyRows.length}
              </span>
              Rows with issues
            </h3>
            {cleanRows.length > 0 && (
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full shadow-sm">
                ✓ {cleanRows.length} clean rows hidden
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {anomalyRows.map(row => (
              <div
                key={row.rowNumber}
                className={`rounded-xl border p-4 transition-all hover:shadow-md ${
                  row.status === 'error'
                    ? 'border-red-500/20 bg-red-500/10'
                    : 'border-amber-500/20 bg-amber-500/10'
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      Row {row.rowNumber} — {row.description || 'No description'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.payer || 'Unknown payer'}
                      {' · '}
                      {row.currency !== 'INR' && row.amountInr
                        ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                        : `₹${row.amountInr || row.amount || 0}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    row.status === 'error'
                      ? 'bg-red-500/20 text-rose-100'
                      : 'bg-amber-500/20 text-amber-100'
                  }`}>
                    {row.status}
                  </span>
                </div>
                {row.anomalies.map((a, i) => (
                  <div
                    key={i}
                    className={`mt-2 text-xs rounded-lg p-2.5 ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info}`}
                  >
                    <span className="font-bold">{a.type}:</span> {a.detail}
                    <div className="mt-1 text-slate-300 text-[11px]">
                      💡 {a.suggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {anomalyRows.length === 0 && (
              <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-8 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-full mb-3 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-emerald-200">No anomalies found</p>
                <p className="text-sm text-emerald-300 mt-1">All rows are clean and ready to import.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 border-white/10 text-slate-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
            >
              Review & Approve →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final approval - premium confirmation */}
      {step === 3 && preview && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-slate-950/90 rounded-xl border border-white/10 shadow-2xl p-6">
            <h3 className="font-extrabold text-slate-100 text-lg mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Ready to import
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-slate-400">Rows that will be imported</span>
                <span className="font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full shadow-sm">
                  {preview.summary.cleanRows + preview.summary.warningRows}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-slate-400">Rows that will be skipped (errors)</span>
                <span className="font-bold text-rose-300 bg-rose-500/10 px-3 py-1 rounded-full shadow-sm">
                  {preview.summary.errorRows}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1">
                <span className="font-semibold text-slate-100">Total rows</span>
                <span className="font-extrabold text-slate-100 bg-slate-800 px-3 py-1 rounded-full">{preview.summary.totalRows}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-amber-200 font-medium">
                Warning rows will be imported with anomaly flags recorded. No data has been written yet.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleReject}
              className="px-4 py-2.5 border-2 border-rose-500/30 text-rose-300 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-all"
            >
              Cancel — import nothing
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
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
                '✅ Approve and import'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done - celebratory animation */}
      {step === 4 && result && (
        <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-lg animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-100 mb-3">Import Complete! 🎉</h3>
          <div className="bg-slate-900/80 rounded-xl p-4 inline-block mb-5 shadow">
            <p className="text-lg font-bold text-emerald-300">{result.expensesCreated} expenses imported</p>
          </div>
          <p className="text-sm text-slate-400 mb-6">All anomalies recorded in the audit trail</p>
          <button
            onClick={onComplete}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
          >
            View expenses
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

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
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}