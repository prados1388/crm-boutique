import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Clientes from './components/clientes.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/clientes" element={<Clientes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

