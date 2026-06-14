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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Import CSV</h1>
          <Link
            to={`/groups/${groupId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        {/* Done state */}
        {done && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-700 font-medium">Import complete</p>
            <p className="text-green-600 text-sm mt-1">
              {done.expensesCreated} expenses imported successfully.
            </p>
            <Link
              to={`/groups/${groupId}`}
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              View expenses →
            </Link>
          </div>
        )}

        {/* Upload form */}
        {!preview && !done && (
          <form onSubmit={handleAnalyze} className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-4">
              Upload your CSV file. The app will analyze it and show you every
              issue before importing anything.
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={e => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 mb-4
                file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze file'}
            </button>
          </form>
        )}

        {/* Preview — Meera's approval screen */}
        {preview && (
          <div className="space-y-4">

            {/* Summary banner */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Analysis summary
              </h2>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Total rows',   value: preview.summary.totalRows,   color: 'text-gray-700' },
                  { label: 'Clean',        value: preview.summary.cleanRows,   color: 'text-green-600' },
                  { label: 'Warnings',     value: preview.summary.warningRows, color: 'text-yellow-600' },
                  { label: 'Errors',       value: preview.summary.errorRows,   color: 'text-red-500' }
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded p-3">
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Row-by-row preview */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Row details
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {preview.rows.map(row => (
                  <div
                    key={row.rowNumber}
                    className={`border rounded p-3 text-xs ${
                      row.status === 'error'   ? 'border-red-200 bg-red-50'
                      : row.status === 'warning' ? 'border-yellow-200 bg-yellow-50'
                      : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-700">
                        Row {row.rowNumber} — {row.description || 'No description'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        row.status === 'error'   ? 'bg-red-100 text-red-700'
                        : row.status === 'warning' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                        {row.status}
                      </span>
                    </div>

                    <div className="text-gray-500 mb-1">
                      {row.date
                        ? new Date(row.date).toLocaleDateString('en-IN')
                        : 'No date'}
                      {' · '}
                      {row.payer || 'Unknown payer'}
                      {' · '}
                      {row.currency !== 'INR'
                        ? `${row.currency} ${row.amount} → ₹${row.amountInr}`
                        : `₹${row.amountInr}`}
                    </div>

                    {row.anomalies.map((a, i) => (
                      <div
                        key={i}
                        className={`mt-1 p-1.5 rounded border text-xs ${
                          SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info
                        }`}
                      >
                        <span className="font-medium">{a.type}: </span>
                        {a.detail}
                        <br />
                        <span className="opacity-75">→ {a.suggestedAction}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Approve / Reject buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded text-sm font-medium hover:bg-gray-50"
              >
                Reject — import nothing
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? 'Importing...'
                  : `Approve — import ${
                      preview.summary.cleanRows + preview.summary.warningRows
                    } rows`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}