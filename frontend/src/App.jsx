import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login    from './pages/Login'
import Register from './pages/Register'
import AcceptInvite from './pages/AcceptInvite'
import Home     from './pages/Home'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="/*" element={
            <PrivateRoute><Home /></PrivateRoute>
          }/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}