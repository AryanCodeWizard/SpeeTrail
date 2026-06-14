import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STEPS = ['Upload', 'Preview', 'Anomalies', 'Approve', 'Done']

const SEVERITY_STYLE = {
  error:   'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  info:    'bg-blue-50 border-blue-200 text-blue-600'
}

export default function ImportWizard({ groupId, onComplete }) {
  const [step,      setStep]      = useState(0)
  const [file,      setFile]      = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)

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
  const cleanRows   = preview?.rows?.filter(r => r.status === 'clean')    || []
  const errorRows   = preview?.rows?.filter(r => r.status === 'error')    || []

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-teal-600' : 'text-gray-300'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i < step  ? 'bg-teal-500 border-teal-500 text-white'
                : i === step ? 'border-teal-500 text-teal-600'
                : 'border-gray-200 text-gray-300'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-teal-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm font-medium text-gray-700 mb-1">Upload your expenses CSV</p>
          <p className="text-xs text-gray-400 mb-6">
            We'll detect anomalies and show you a preview before importing anything
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={e => setFile(e.target.files[0])}
            className="block mx-auto text-sm text-gray-500
              file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
              file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700
              hover:file:bg-teal-100 mb-4"
          />
          {file && (
            <p className="text-xs text-gray-500 mb-4">
              Selected: <span className="font-medium">{file.name}</span>
              {' '}({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze file'}
          </button>
        </div>
      )}

      {/* Step 1: Preview summary */}
      {step === 1 && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              { label: 'Total rows',  value: preview.summary.totalRows,   color: 'text-gray-700' },
              { label: 'Clean',       value: preview.summary.cleanRows,   color: 'text-green-600' },
              { label: 'Warnings',    value: preview.summary.warningRows, color: 'text-yellow-600' },
              { label: 'Errors',      value: preview.summary.errorRows,   color: 'text-red-500' }
            ].map(item => (
              <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-600"
            >
              Review anomalies →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Anomaly detail */}
      {step === 2 && preview && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {anomalyRows.length} rows with issues
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {anomalyRows.map(row => (
              <div
                key={row.rowNumber}
                className={`border rounded-lg p-3 ${
                  row.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-semibold text-gray-700">
                    Row {row.rowNumber} — {row.description || 'No description'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    row.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {row.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {row.payer || 'Unknown payer'}
                  {' · '}
                  {row.currency !== 'INR' && row.amountInr
                    ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                    : `₹${row.amountInr || row.amount || 0}`}
                </p>
                {row.anomalies.map((a, i) => (
                  <div key={i} className={`text-xs border rounded p-2 mb-1 ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info}`}>
                    <span className="font-medium">{a.type}:</span> {a.detail}
                    <br />
                    <span className="opacity-75">→ {a.suggestedAction}</span>
                  </div>
                ))}
              </div>
            ))}

            {anomalyRows.length === 0 && (
              <p className="text-sm text-green-600 text-center py-4">
                No anomalies found — all rows are clean!
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-600"
            >
              Review and approve →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final approval */}
      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Ready to import</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Rows that will be imported</span>
                <span className="font-semibold text-green-600">
                  {preview.summary.cleanRows + preview.summary.warningRows}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Rows that will be skipped (errors)</span>
                <span className="font-semibold text-red-500">
                  {preview.summary.errorRows}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="font-medium">Total rows</span>
                <span className="font-semibold">{preview.summary.totalRows}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Warning rows will be imported with anomaly flags recorded.
            No data has been written yet.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              Cancel — import nothing
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Approve and import`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && result && (
        <div className="text-center py-10">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-semibold text-gray-800 mb-2">Import complete</h3>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold text-teal-600">{result.expensesCreated}</span> expenses imported
          </p>
          <p className="text-xs text-gray-400 mb-6">
            All anomalies are recorded in the import audit trail
          </p>
          <button
            onClick={onComplete}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-600"
          >
            View expenses →
          </button>
        </div>
      )}
    </div>
  )
}