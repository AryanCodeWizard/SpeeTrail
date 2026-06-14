import { AuthProvider, useAuth } from './context/AuthContext'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Balances     from './pages/Balances'
import Dashboard    from './pages/Dashboard'
import GroupDetail  from './pages/GroupDetail'
import ImportPage   from './pages/ImportPage'
import Login        from './pages/Login'
import Register     from './pages/Register'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          }/>
          <Route path="/groups/:groupId" element={
            <PrivateRoute><GroupDetail /></PrivateRoute>
          }/>
          <Route path="/groups/:groupId/balances" element={
            <PrivateRoute><Balances /></PrivateRoute>
          }/>
          <Route path="/groups/:groupId/import" element={
            <PrivateRoute><ImportPage /></PrivateRoute>
          }/>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}