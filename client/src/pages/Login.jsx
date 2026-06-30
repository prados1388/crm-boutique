import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../apiBase.js';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const respuesta = await fetch(`${API_BASE}/api/staff/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(resultado.mensaje || 'No se pudo iniciar sesion.');
        return;
      }

      localStorage.setItem('token', resultado.token);
      navigate('/clientes');
    } catch {
      setMensaje('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <section className={styles.hero} aria-label="Presentación del CRM">
        <p className={styles.kicker}>CRM Boutique</p>
        <h1>Gestión de ventas, seguimiento clientes y registro de datos</h1>
        <p className={styles.heroText}>
          Accede al panel interno para potenciar tus ventas, hacer lista de favoritos, acceder a los datos de tus clientes y crear tus planes de acción.
        </p>
        <div className={styles.heroList}>
          <span>Clientes</span>
          <span>Compras</span>
          <span>Alarmas</span>
          <span>VIP anual</span>
        </div>
      </section>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formHead}>
          <p className={styles.formEyebrow}>Acceso privado</p>
          <h2>Iniciar sesión</h2>
          <p>Introduce tus credenciales de staff para continuar.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="profe@crm.com"
            autoComplete="email"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />
        </div>

        {mensaje && (
          <p className={styles.error} role="alert" aria-live="polite">
            {mensaje}
          </p>
        )}

        <button type="submit" disabled={cargando} className={styles.submit}>
          {cargando ? 'Entrando…' : 'Entrar al CRM'}
        </button>
      </form>
    </div>
  );
};

export default Login;
