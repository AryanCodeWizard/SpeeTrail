import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STEPS = ['Upload', 'Preview', 'Anomalies', 'Approve', 'Done']

const SEVERITY_STYLE = {
  error:   'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-700',
  warning: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-700',
  info:    'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 text-blue-600'
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
                    : 'bg-gray-200 text-gray-500'}
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
                i <= step ? 'text-indigo-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-1 sm:mx-2 rounded-full transition-all duration-500 ${
                i < step ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Upload - premium design */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-all duration-300 p-8 sm:p-12 text-center shadow-sm hover:shadow-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mb-5 shadow-inner">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Import CSV File</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
            Upload your expense CSV. We'll analyze and guide you through the import process.
          </p>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              className="hidden"
            />
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition-all shadow-sm hover:shadow">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose CSV file
            </div>
          </label>
          {file && (
            <div className="mt-5 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl inline-block shadow-sm">
              <p className="text-sm text-green-700 font-medium">
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
              { label: 'Total rows', value: preview.summary.totalRows, color: 'from-gray-600 to-gray-700', bg: 'from-gray-100 to-gray-200' },
              { label: 'Clean', value: preview.summary.cleanRows, color: 'from-green-600 to-emerald-600', bg: 'from-green-100 to-emerald-100' },
              { label: 'Warnings', value: preview.summary.warningRows, color: 'from-amber-600 to-orange-600', bg: 'from-amber-100 to-orange-100' },
              { label: 'Errors', value: preview.summary.errorRows, color: 'from-red-600 to-rose-600', bg: 'from-red-100 to-rose-100' }
            ].map(item => (
              <div key={item.label} className={`bg-gradient-to-br ${item.bg} rounded-xl p-4 text-center border border-white/50 shadow-md`}>
                <p className={`text-3xl font-extrabold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.value}</p>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">{item.label}</p>
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
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs shadow">
                {anomalyRows.length}
              </span>
              Rows with issues
            </h3>
            {cleanRows.length > 0 && (
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full shadow-sm">
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
                    ? 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
                    : 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Row {row.rowNumber} — {row.description || 'No description'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {row.payer || 'Unknown payer'}
                      {' · '}
                      {row.currency !== 'INR' && row.amountInr
                        ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                        : `₹${row.amountInr || row.amount || 0}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    row.status === 'error'
                      ? 'bg-red-200 text-red-800'
                      : 'bg-amber-200 text-amber-800'
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
                    <div className="mt-1 text-gray-700 text-[11px]">
                      💡 {a.suggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {anomalyRows.length === 0 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl p-8 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-3 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-green-800">No anomalies found</p>
                <p className="text-sm text-green-700 mt-1">All rows are clean and ready to import.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
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
          <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6">
            <h3 className="font-extrabold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Ready to import
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Rows that will be imported</span>
                <span className="font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full shadow-sm">
                  {preview.summary.cleanRows + preview.summary.warningRows}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Rows that will be skipped (errors)</span>
                <span className="font-bold text-red-500 bg-red-100 px-3 py-1 rounded-full shadow-sm">
                  {preview.summary.errorRows}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1">
                <span className="font-semibold text-gray-800">Total rows</span>
                <span className="font-extrabold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{preview.summary.totalRows}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-amber-800 font-medium">
                Warning rows will be imported with anomaly flags recorded. No data has been written yet.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleReject}
              className="px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
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
          <h3 className="text-2xl font-extrabold text-gray-800 mb-3">Import Complete! 🎉</h3>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 inline-block mb-5 shadow">
            <p className="text-lg font-bold text-green-700">{result.expensesCreated} expenses imported</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">All anomalies recorded in the audit trail</p>
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