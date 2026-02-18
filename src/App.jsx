import { Routes, Route } from 'react-router'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RecoverPassword from './pages/auth/RecoverPassword'
import Home from "@/pages/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/recover" element={<RecoverPassword />} />
      <Route path='/home' element={<Home/> } />
    </Routes>
  )
}

export default App