import { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { API_BASE } from '../apiBase.js';
import styles from './clientes.module.css';

const CATEGORIA_LABEL = {
  textil: 'Textil',
  hogar: 'Hogar / casas',
  cosmetica: 'Cosmética',
  otro: 'Otro',
};

const CANAL_LABEL = {
  tienda: 'Tienda',
  online: 'Online',
};

const MESES_ANALISIS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const MES_ACTUAL_VALUE = String(new Date().getMonth() + 1);

const nombreMesPorValor = (valor) => (
  MESES_ANALISIS.find((mes) => mes.value === String(valor))?.label || ''
);

function fechaParaInputDatetimeLocal(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatoFechaNota(nota) {
  const raw = nota.createdAt;
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function formatoFechaCompra(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

/** Añade https:// si falta el protocolo (pegar dominio desde la barra del navegador). */
function normalizarUrlWeb(valor) {
  const t = (valor || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function urlWebEsValida(valor) {
  const t = (valor || '').trim();
  if (!t) return true;
  try {
    const u = new URL(normalizarUrlWeb(t));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Cuerpo PUT para no perder alarma ni wishlist al actualizar otros campos desde el front. */
function snapshotClienteParaPut(c) {
  return {
    nombre: c.nombre,
    email: c.email || '',
    telefono: c.telefono || '',
    cumpleanos: (c.cumpleanos || '').trim(),
    alarmaCuando: c.alarmaCuando ?? null,
    alarmaDescripcion: c.alarmaDescripcion || '',
    wishlist: Array.isArray(c.wishlist) ? c.wishlist.map((w) => ({
      nombre: (w.nombre || '').trim(),
      categoria: ['textil', 'hogar', 'cosmetica', 'otro'].includes(w.categoria) ? w.categoria : 'otro',
      url: typeof w.url === 'string' ? w.url.trim() : '',
    })).filter((w) => w.nombre) : [],
  };
}

function formatoEuro(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function capitalizarPrimera(valor) {
  if (!valor) return '';
  return `${valor.charAt(0).toUpperCase()}${valor.slice(1)}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nombre obligatorio; al menos email o teléfono (uso real: tienda, clienta sin email). */
function validarClienteContacto({ nombre, email, telefono }) {
  const nombreTrim = (nombre || '').trim();
  const emailTrim = (email || '').trim();
  const telefonoTrim = (telefono || '').trim();
  if (!nombreTrim) {
    return { ok: false, mensaje: 'El nombre es obligatorio.' };
  }
  if (!emailTrim && !telefonoTrim) {
    return {
      ok: false,
      mensaje: 'Indica al menos un email o un teléfono (sirve para WhatsApp) para poder localizar al cliente.',
    };
  }
  if (emailTrim && !EMAIL_REGEX.test(emailTrim)) {
    return { ok: false, mensaje: 'El email no tiene un formato válido.' };
  }
  return { ok: true, nombre: nombreTrim, email: emailTrim, telefono: telefonoTrim };
}

export default function Clientes() {
  const navigate = useNavigate();
  const [listaClientes, setListaClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [toast, setToast] = useState(null);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoCliente, setEliminandoCliente] = useState(false);
  const [guardandoAlarma, setGuardandoAlarma] = useState(false);
  const [guardandoWishlist, setGuardandoWishlist] = useState(false);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', cumpleanos: '', ventasAcumuladas: 0 });
  const [formError, setFormError] = useState('');
  const [editError, setEditError] = useState('');
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [listaNotas, setListaNotas] = useState([]);
  const [textoNuevaNota, setTextoNuevaNota] = useState('');
  const [clienteAEditar, setClienteAEditar] = useState(null);

  const [clienteAlarma, setClienteAlarma] = useState(null);
  const [alarmaInputLocal, setAlarmaInputLocal] = useState('');
  const [alarmaDescripcion, setAlarmaDescripcion] = useState('');

  const [clienteWishlist, setClienteWishlist] = useState(null);
  const [wishlistDraft, setWishlistDraft] = useState([]);
  const [newWishNombre, setNewWishNombre] = useState('');
  const [newWishCat, setNewWishCat] = useState('textil');
  const [newWishUrl, setNewWishUrl] = useState('');

  const [clienteRegistrarVenta, setClienteRegistrarVenta] = useState(null);
  const [ventaImporte, setVentaImporte] = useState('');
  const [ventaCanal, setVentaCanal] = useState('tienda');
  const [ventaNotas, setVentaNotas] = useState('');

  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroVip, setFiltroVip] = useState('todos');
  const [analisisFacturacionAbierto, setAnalisisFacturacionAbierto] = useState(false);
  const [analisisAnio, setAnalisisAnio] = useState('historico');
  const [analisisMes, setAnalisisMes] = useState(MES_ACTUAL_VALUE);
  const [resumenFacturacion, setResumenFacturacion] = useState(null);
  const [cargandoResumenFacturacion, setCargandoResumenFacturacion] = useState(false);
  const [clienteComprasHistorial, setClienteComprasHistorial] = useState(null);
  const [listaComprasHistorial, setListaComprasHistorial] = useState([]);
  const [cargandoComprasHistorial, setCargandoComprasHistorial] = useState(false);
  const [filtroAnioHistorial, setFiltroAnioHistorial] = useState('todos');

  const tokenGuardado = localStorage.getItem('token');

  const showToast = useCallback((kind, text) => {
    setToast({ kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const modalAbierto = !!(
      clienteSeleccionado
      || clienteAlarma
      || clienteWishlist
      || clienteRegistrarVenta
      || clienteAEditar
      || clienteComprasHistorial
    );
    if (!modalAbierto) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setClienteSeleccionado(null);
      setClienteAlarma(null);
      setAlarmaInputLocal('');
      setAlarmaDescripcion('');
      setClienteWishlist(null);
      setWishlistDraft([]);
      setNewWishUrl('');
      setClienteRegistrarVenta(null);
      setClienteAEditar(null);
      setEditError('');
      setClienteComprasHistorial(null);
      setListaComprasHistorial([]);
      setFiltroAnioHistorial('todos');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clienteSeleccionado, clienteAlarma, clienteWishlist, clienteRegistrarVenta, clienteAEditar, clienteComprasHistorial]);

  const pedirClientesAlServidor = useCallback(async () => {
    try {
      setErrorCarga('');
      const respuesta = await fetch(`${API_BASE}/api/clientes`, {
        headers: { 'Authorization': `Bearer ${tokenGuardado}` }
      });
      if (respuesta.status === 401) {
        localStorage.removeItem('token');
        navigate('/', { replace: true });
        setCargando(false);
        return;
      }
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setListaClientes(Array.isArray(datos) ? datos : []);
      } else {
        const err = await respuesta.json().catch(() => ({}));
        console.error('GET /api/clientes', respuesta.status, err);
        setListaClientes([]);
        setErrorCarga(err.mensaje || `No se pudieron cargar los clientes (error ${respuesta.status}).`);
      }
      setCargando(false);
    } catch (e) {
      console.error('Error al pedir datos', e);
      setListaClientes([]);
      setErrorCarga('No hay conexión con el servidor. Comprueba que el backend esté en marcha.');
      setCargando(false);
    }
  }, [tokenGuardado, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokenGuardado) pedirClientesAlServidor();
  }, [pedirClientesAlServidor, tokenGuardado]);

  const cargarResumenFacturacion = useCallback(async () => {
    setCargandoResumenFacturacion(true);
    try {
      const params = new URLSearchParams();
      if (analisisAnio !== 'historico') {
        params.set('anio', analisisAnio);
        if (analisisMes) params.set('mes', analisisMes);
      }
      const query = params.toString();
      const respuesta = await fetch(`${API_BASE}/api/compras/resumen${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${tokenGuardado}` },
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setResumenFacturacion(datos);
      } else {
        showToast('err', 'No se pudo calcular la facturación seleccionada.');
      }
    } catch {
      showToast('err', 'Error de conexión al calcular facturación.');
    } finally {
      setCargandoResumenFacturacion(false);
    }
  }, [analisisAnio, analisisMes, tokenGuardado, showToast]);

  useEffect(() => {
    if (tokenGuardado) cargarResumenFacturacion();
  }, [cargarResumenFacturacion, tokenGuardado]);

  const resumenDashboard = useMemo(() => {
    const total = listaClientes.length;
    const vips = listaClientes.filter((c) => c.esVip).length;
    let sumaTotal = 0;
    let sumaAnio = 0;
    for (const c of listaClientes) {
      sumaTotal += Number(c.ventasTotal ?? c.ventasAcumuladas ?? 0) || 0;
      sumaAnio += Number(c.ventasAnioActual ?? 0) || 0;
    }
    return { total, vips, sumaTotal, sumaAnio };
  }, [listaClientes]);

  const clientesFiltrados = useMemo(() => {
    const q = filtroBusqueda.trim().toLowerCase();
    return listaClientes.filter((c) => {
      if (filtroVip === 'vip' && !c.esVip) return false;
      if (filtroVip === 'normal' && c.esVip) return false;
      if (!q) return true;
      const ficha = [c.nombre, c.email, c.telefono, c.cumpleanos]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ');
      return ficha.includes(q);
    });
  }, [listaClientes, filtroBusqueda, filtroVip]);

  const resumenComprasHistorial = useMemo(() => {
    const ahoraResumen = new Date();
    const anioActualResumen = ahoraResumen.getUTCFullYear();
    const mesActualResumen = ahoraResumen.getUTCMonth();
    const añosSet = new Set();
    let totalHistorico = 0;
    let totalAnual = 0;
    let totalMes = 0;

    const comprasConFecha = listaComprasHistorial.map((compra) => {
      const fecha = new Date(compra.createdAt);
      const fechaValida = !Number.isNaN(fecha.getTime());
      const anio = fechaValida ? fecha.getUTCFullYear() : null;
      const mes = fechaValida ? fecha.getUTCMonth() : null;
      const importe = Number(compra.importe) || 0;

      totalHistorico += importe;
      if (anio !== null) añosSet.add(anio);
      if (anio === anioActualResumen) totalAnual += importe;
      if (anio === anioActualResumen && mes === mesActualResumen) totalMes += importe;

      return { compra, anio };
    });

    const comprasFiltradas = comprasConFecha
      .filter(({ anio }) => filtroAnioHistorial === 'todos' || String(anio) === filtroAnioHistorial)
      .map(({ compra }) => compra);

    const totalFiltro = comprasFiltradas.reduce((acc, compra) => acc + (Number(compra.importe) || 0), 0);

    return {
      años: Array.from(añosSet).sort((a, b) => b - a),
      comprasFiltradas,
      totalHistorico,
      totalAnual,
      totalMes,
      totalFiltro,
    };
  }, [listaComprasHistorial, filtroAnioHistorial]);

  const crearCliente = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validarClienteContacto(form);
    if (!v.ok) {
      setFormError(v.mensaje);
      return;
    }
    const cuerpo = {
      ...form,
      nombre: v.nombre,
      email: v.email,
      telefono: v.telefono,
      cumpleanos: (form.cumpleanos || '').trim(),
    };
    setGuardandoCliente(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenGuardado}` },
        body: JSON.stringify(cuerpo)
      });

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        pedirClientesAlServidor();
        setForm({ nombre: '', email: '', telefono: '', cumpleanos: '', ventasAcumuladas: 0 });
        setFormError('');
        showToast('ok', 'Cliente guardado correctamente.');
      } else {
        showToast('err', resultado.mensaje || 'No se pudo guardar el cliente.');
      }
    } catch {
      showToast('err', 'No se pudo conectar con el servidor.');
    } finally {
      setGuardandoCliente(false);
    }
  };

// 1. Cargar el historial de notas del cliente
  const cargarNotasDelCliente = async (idCliente) => {
    try {
      const respuesta = await fetch(`${API_BASE}/api/notas/cliente/${idCliente}`, {
        headers: { 'Authorization': `Bearer ${tokenGuardado}` }
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setListaNotas(datos);
      } else {
        showToast('err', 'No se pudieron cargar las notas.');
      }
    } catch (e) {
      console.error("Error al cargar las notas", e);
      showToast('err', 'Error de conexión al cargar notas.');
    }
  };

  // 2. Guardar una nota nueva en el historial
  const guardarNuevaNota = async () => {
    if (!textoNuevaNota.trim()) return;

    setGuardandoNota(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/notas`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${tokenGuardado}` 
        },
        body: JSON.stringify({ contenido: textoNuevaNota, cliente: clienteSeleccionado._id })
      });

      if (respuesta.ok) {
        setTextoNuevaNota('');
        cargarNotasDelCliente(clienteSeleccionado._id);
        showToast('ok', 'Nota añadida al historial.');
      } else {
        showToast('err', 'No se pudo guardar la nota.');
      }
    } catch (e) {
      showToast('err', 'Error de conexión al guardar la nota.');
    } finally {
      setGuardandoNota(false);
    }
  };

  // 3. Guardar los cambios del cliente editado
  const guardarEdicionCliente = async () => {
    setEditError('');
    const v = validarClienteContacto(clienteAEditar);
    if (!v.ok) {
      setEditError(v.mensaje);
      return;
    }
    setGuardandoEdicion(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes/${clienteAEditar._id}`, {
        method: 'PUT', // PUT es el método para actualizar
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${tokenGuardado}` 
        },
        body: JSON.stringify({
          ...snapshotClienteParaPut(clienteAEditar),
          nombre: v.nombre,
          email: v.email,
          telefono: v.telefono,
          cumpleanos: (clienteAEditar.cumpleanos || '').trim(),
        })
      });

      if (respuesta.ok) {
        pedirClientesAlServidor();
        setClienteAEditar(null);
        setEditError('');
        showToast('ok', 'Datos del cliente actualizados.');
      } else {
        showToast('err', 'No se pudieron guardar los cambios.');
      }
    } catch (e) {
      showToast('err', 'Error de conexión al guardar.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const cerrarModalesDelCliente = (clienteId) => {
    if (clienteSeleccionado?._id === clienteId) setClienteSeleccionado(null);
    if (clienteAlarma?._id === clienteId) setClienteAlarma(null);
    if (clienteWishlist?._id === clienteId) setClienteWishlist(null);
    if (clienteRegistrarVenta?._id === clienteId) setClienteRegistrarVenta(null);
    if (clienteComprasHistorial?._id === clienteId) setClienteComprasHistorial(null);
  };

  const eliminarClienteActual = async () => {
    if (!clienteAEditar) return;
    const nombre = (clienteAEditar.nombre || '').trim() || 'este cliente';
    const confirmar = window.confirm(
      `¿Eliminar la ficha de "${nombre}" por completo? Se borrarán también sus compras y notas. Esta acción no se puede deshacer.`,
    );
    if (!confirmar) return;

    setEliminandoCliente(true);
    setEditError('');
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes/${clienteAEditar._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenGuardado}` },
      });
      if (respuesta.ok) {
        const idEliminado = clienteAEditar._id;
        cerrarModalesDelCliente(idEliminado);
        setClienteAEditar(null);
        await pedirClientesAlServidor();
        showToast('ok', 'Cliente eliminado.');
      } else {
        const resultado = await respuesta.json().catch(() => ({}));
        showToast('err', resultado.mensaje || 'No se pudo eliminar el cliente.');
      }
    } catch {
      showToast('err', 'Error de conexión al eliminar.');
    } finally {
      setEliminandoCliente(false);
    }
  };

  const abrirModalAlarma = (c) => {
    setClienteAlarma(c);
    setAlarmaDescripcion((c.alarmaDescripcion || '').trim());
    setAlarmaInputLocal(c.alarmaCuando ? fechaParaInputDatetimeLocal(c.alarmaCuando) : '');
  };

  const cerrarModalAlarma = () => {
    setClienteAlarma(null);
    setAlarmaInputLocal('');
    setAlarmaDescripcion('');
  };

  const guardarAlarma = async () => {
    if (!clienteAlarma) return;
    if (!alarmaInputLocal.trim()) {
      showToast('err', 'Elige fecha y hora para la alarma.');
      return;
    }
    const cuando = new Date(alarmaInputLocal);
    if (Number.isNaN(cuando.getTime())) {
      showToast('err', 'Fecha u hora no válida.');
      return;
    }
    const base = snapshotClienteParaPut(clienteAlarma);
    setGuardandoAlarma(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes/${clienteAlarma._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenGuardado}`,
        },
        body: JSON.stringify({
          ...base,
          alarmaCuando: cuando.toISOString(),
          alarmaDescripcion: alarmaDescripcion.trim(),
        }),
      });
      if (respuesta.ok) {
        await pedirClientesAlServidor();
        cerrarModalAlarma();
        showToast('ok', 'Alarma guardada.');
      } else {
        const resultado = await respuesta.json().catch(() => ({}));
        showToast('err', resultado.mensaje || 'No se pudo guardar la alarma.');
      }
    } catch {
      showToast('err', 'Error de conexión al guardar la alarma.');
    } finally {
      setGuardandoAlarma(false);
    }
  };

  const quitarAlarma = async () => {
    if (!clienteAlarma) return;
    const base = snapshotClienteParaPut(clienteAlarma);
    setGuardandoAlarma(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes/${clienteAlarma._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenGuardado}`,
        },
        body: JSON.stringify({
          ...base,
          alarmaCuando: null,
          alarmaDescripcion: '',
        }),
      });
      if (respuesta.ok) {
        await pedirClientesAlServidor();
        cerrarModalAlarma();
        showToast('ok', 'Alarma eliminada.');
      } else {
        showToast('err', 'No se pudo quitar la alarma.');
      }
    } catch {
      showToast('err', 'Error de conexión.');
    } finally {
      setGuardandoAlarma(false);
    }
  };

  const abrirModalWishlist = (c) => {
    setClienteWishlist(c);
    setWishlistDraft(
      Array.isArray(c.wishlist)
        ? c.wishlist.map((w) => ({
            nombre: w.nombre || '',
            categoria: ['textil', 'hogar', 'cosmetica', 'otro'].includes(w.categoria) ? w.categoria : 'otro',
            url: typeof w.url === 'string' ? w.url.trim() : '',
          }))
        : [],
    );
    setNewWishNombre('');
    setNewWishCat('textil');
    setNewWishUrl('');
  };

  const cerrarModalWishlist = () => {
    setClienteWishlist(null);
    setWishlistDraft([]);
    setNewWishUrl('');
  };

  const añadirProductoWishlist = () => {
    const n = newWishNombre.trim();
    if (!n) return;
    const urlRaw = newWishUrl.trim();
    if (urlRaw && !urlWebEsValida(urlRaw)) {
      showToast('err', 'La URL no es válida. Usa un enlace completo (https://…).');
      return;
    }
    setWishlistDraft([...wishlistDraft, { nombre: n, categoria: newWishCat, url: urlRaw }]);
    setNewWishNombre('');
    setNewWishUrl('');
  };

  const quitarProductoWishlist = (indice) => {
    setWishlistDraft(wishlistDraft.filter((_, i) => i !== indice));
  };

  const guardarWishlist = async () => {
    if (!clienteWishlist) return;
    for (const w of wishlistDraft) {
      const u = (w.url || '').trim();
      if (u && !urlWebEsValida(u)) {
        showToast('err', `Revisa la URL del producto «${w.nombre.trim()}».`);
        return;
      }
    }
    const base = snapshotClienteParaPut(clienteWishlist);
    setGuardandoWishlist(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/clientes/${clienteWishlist._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenGuardado}`,
        },
        body: JSON.stringify({
          ...base,
          wishlist: wishlistDraft.map((w) => ({
            nombre: w.nombre.trim(),
            categoria: w.categoria,
            url: (w.url || '').trim() ? normalizarUrlWeb(w.url) : '',
          })),
        }),
      });
      if (respuesta.ok) {
        await pedirClientesAlServidor();
        cerrarModalWishlist();
        showToast('ok', 'Favoritos guardados.');
      } else {
        showToast('err', 'No se pudo guardar la lista de favoritos.');
      }
    } catch {
      showToast('err', 'Error de conexión.');
    } finally {
      setGuardandoWishlist(false);
    }
  };

  const eliminarNotaPorId = async (notaId) => {
    if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    try {
      const respuesta = await fetch(`${API_BASE}/api/notas/${notaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenGuardado}` },
      });
      if (respuesta.ok) {
        if (clienteSeleccionado) {
          cargarNotasDelCliente(clienteSeleccionado._id);
        }
        showToast('ok', 'Nota eliminada.');
      } else {
        const resultado = await respuesta.json().catch(() => ({}));
        showToast('err', resultado.mensaje || 'No se pudo eliminar la nota.');
      }
    } catch {
      showToast('err', 'Error de conexión.');
    }
  };

  const abrirModalVenta = (c) => {
    setClienteRegistrarVenta(c);
    setVentaImporte('');
    setVentaCanal('tienda');
    setVentaNotas('');
  };

  const cerrarModalVenta = () => {
    setClienteRegistrarVenta(null);
  };

  const cargarComprasHistorial = useCallback(async (idCliente) => {
    setCargandoComprasHistorial(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/compras/cliente/${idCliente}`, {
        headers: { Authorization: `Bearer ${tokenGuardado}` },
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setListaComprasHistorial(Array.isArray(datos) ? datos : []);
      } else {
        setListaComprasHistorial([]);
        showToast('err', 'No se pudieron cargar las compras.');
      }
    } catch {
      setListaComprasHistorial([]);
      showToast('err', 'Error de conexión al cargar compras.');
    } finally {
      setCargandoComprasHistorial(false);
    }
  }, [tokenGuardado, showToast]);

  const abrirModalCompras = (c) => {
    setClienteComprasHistorial(c);
    setListaComprasHistorial([]);
    setFiltroAnioHistorial('todos');
    cargarComprasHistorial(c._id);
  };

  const cerrarModalCompras = () => {
    setClienteComprasHistorial(null);
    setListaComprasHistorial([]);
    setFiltroAnioHistorial('todos');
  };

  const guardarVenta = async () => {
    if (!clienteRegistrarVenta) return;
    const imp = parseFloat(String(ventaImporte).replace(',', '.'));
    if (!Number.isFinite(imp) || imp <= 0) {
      showToast('err', 'Introduce un importe válido mayor que 0.');
      return;
    }
    setGuardandoVenta(true);
    try {
      const respuesta = await fetch(`${API_BASE}/api/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenGuardado}`,
        },
        body: JSON.stringify({
          cliente: clienteRegistrarVenta._id,
          importe: imp,
          canal: ventaCanal,
          notas: ventaNotas.trim(),
        }),
      });
      if (respuesta.ok) {
        await pedirClientesAlServidor();
        cargarResumenFacturacion();
        if (
          clienteComprasHistorial
          && String(clienteComprasHistorial._id) === String(clienteRegistrarVenta._id)
        ) {
          cargarComprasHistorial(clienteRegistrarVenta._id);
        }
        cerrarModalVenta();
        showToast('ok', 'Venta registrada.');
      } else {
        const resultado = await respuesta.json().catch(() => ({}));
        showToast('err', resultado.mensaje || 'No se pudo registrar la venta.');
      }
    } catch {
      showToast('err', 'Error de conexión.');
    } finally {
      setGuardandoVenta(false);
    }
  };

  const ahora = new Date();
  const añoActual = ahora.getUTCFullYear();
  const mesActualNombre = capitalizarPrimera(
    ahora.toLocaleDateString('es-ES', { month: 'long' }),
  );
  const añosComparativa = Array.from({ length: 7 }, (_, i) => añoActual - i);
  const añosFacturacion = Array.from(new Set([
    ...(Array.isArray(resumenFacturacion?.añosDisponibles) ? resumenFacturacion.añosDisponibles : []),
    ...añosComparativa,
  ])).sort((a, b) => b - a);
  const facturacionHistoricaValor = resumenFacturacion?.totalHistorico ?? resumenDashboard.sumaTotal;
  const facturacionSeleccionadaLabel = analisisAnio === 'historico'
    ? 'Facturación histórica'
    : `Facturación ${analisisMes ? `${nombreMesPorValor(analisisMes)} ` : ''}${analisisAnio}`;
  const facturacionSeleccionadaValor = analisisAnio === 'historico'
    ? facturacionHistoricaValor
    : (resumenFacturacion?.totalPeriodo ?? 0);

  if (!tokenGuardado) return <Navigate to="/" />;
  if (cargando) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingShell} role="status" aria-live="polite">
          <div className={styles.spinner} aria-hidden="true" />
          <p className={styles.loadingText}>Cargando clientes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <div className={styles.brandText}>
            <h1 className={styles.title}>CRM Boutique</h1>
            <p className={styles.tagline}>Ventas, seguimiento de clientes y registro de datos</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.sessionPill}>Sesión staff</span>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('token'); navigate('/'); }}
            className={styles.logoutBtn}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {errorCarga ? (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorBannerText}>{errorCarga}</span>
          <button
            type="button"
            className={styles.errorBannerBtn}
            onClick={() => { setErrorCarga(''); pedirClientesAlServidor(); }}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {toast ? (
        <div
          className={toast.kind === 'ok' ? styles.toastOk : styles.toastErr}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      ) : null}

      <section className={styles.sectionCard}>
        <header className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Nuevo cliente</h2>
          <p className={styles.sectionLead}>
            Registra un nuevo contacto añadiendo toda la información posible.
          </p>
        </header>
        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
        <form onSubmit={crearCliente} className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="nuevo-nombre">Nombre completo</label>
            <input
              id="nuevo-nombre"
              placeholder="Ej.: Ana García"
              value={form.nombre}
              onChange={e => { setFormError(''); setForm({ ...form, nombre: e.target.value }); }}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="nuevo-email">Email</label>
            <input
              id="nuevo-email"
              placeholder="cliente@email.com"
              type="email"
              value={form.email}
              onChange={e => { setFormError(''); setForm({ ...form, email: e.target.value }); }}
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="nuevo-telefono">Teléfono</label>
            <input
              id="nuevo-telefono"
              placeholder="Ej.: 600 123 456"
              value={form.telefono}
              onChange={e => { setFormError(''); setForm({ ...form, telefono: e.target.value }); }}
              className={styles.input}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="nuevo-nacimiento">Fecha de nacimiento</label>
            <input
              id="nuevo-nacimiento"
              placeholder="DD/MM"
              value={form.cumpleanos}
              onChange={e => { setFormError(''); setForm({ ...form, cumpleanos: e.target.value }); }}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.submitGreen} disabled={guardandoCliente}>
            {guardandoCliente ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </form>
        <p className={styles.formFootnote}>
          El nombre es obligatorio. Indica al menos email o teléfono para poder localizar al cliente.
        </p>
      </section>

      {!errorCarga && listaClientes.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Aún no hay clientes</p>
          <p className={styles.emptyText}>
            Usa el formulario de arriba para dar de alta contactos; aparecerán aquí en tarjetas.
          </p>
        </div>
      ) : null}

      {!errorCarga && listaClientes.length > 0 ? (
        <>
          <section className={styles.dashboardSection} aria-label="Resumen del listado">
            <header className={styles.dashboardHead}>
              <div>
                <p className={styles.dashboardEyebrow}>Actividad comercial</p>
                <h2 className={styles.dashboardTitle}>Vista general</h2>
              </div>
              <p className={styles.dashboardSubtitle}>
                Datos calculados con las compras registradas y el estado VIP del año {añoActual}.
              </p>
            </header>
            <div className={styles.dashboardRow}>
              <div className={styles.dashboardCard}>
                <span className={styles.dashboardLabel}>Clientes</span>
                <span className={styles.dashboardValue}>{resumenDashboard.total}</span>
              </div>
              <div className={styles.dashboardCard}>
                <span className={styles.dashboardLabel}>VIP (año en curso)</span>
                <span className={styles.dashboardValue}>{resumenDashboard.vips}</span>
              </div>
              <div className={styles.dashboardCard}>
                <span className={styles.dashboardLabel}>Facturación {añoActual}</span>
                <span className={styles.dashboardValue}>{formatoEuro(resumenDashboard.sumaAnio)} €</span>
              </div>
              <div className={styles.dashboardCard}>
                <div className={styles.dashboardCardTop}>
                  <span className={styles.dashboardLabel}>{facturacionSeleccionadaLabel}</span>
                  <button
                    type="button"
                    className={styles.dashboardSearchBtn}
                    onClick={() => setAnalisisFacturacionAbierto((v) => !v)}
                    aria-expanded={analisisFacturacionAbierto}
                    aria-controls="panel-facturacion-historica"
                    title="Elegir año y mes"
                  >
                    <span aria-hidden="true">⌕</span>
                  </button>
                </div>
                <span className={styles.dashboardValue}>
                  {cargandoResumenFacturacion ? '...' : `${formatoEuro(facturacionSeleccionadaValor)} €`}
                </span>
              </div>
            </div>
            {analisisFacturacionAbierto ? (
              <div id="panel-facturacion-historica" className={styles.dashboardPeriodPanel}>
                <div>
                  <label htmlFor="analisis-anio">Año</label>
                  <select
                    id="analisis-anio"
                    value={analisisAnio}
                    onChange={(e) => {
                      setAnalisisAnio(e.target.value);
                      if (e.target.value === 'historico') setAnalisisMes(MES_ACTUAL_VALUE);
                    }}
                  >
                    <option value="historico">Histórico total</option>
                    {añosFacturacion.map((anio) => (
                      <option key={anio} value={String(anio)}>{anio}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="analisis-mes">Mes</label>
                  <select
                    id="analisis-mes"
                    value={analisisMes}
                    onChange={(e) => setAnalisisMes(e.target.value)}
                    disabled={analisisAnio === 'historico'}
                  >
                    {MESES_ANALISIS.map((mes) => (
                      <option key={mes.value || 'anio'} value={mes.value}>{mes.label}</option>
                    ))}
                  </select>
                </div>
                <p>
                  {analisisAnio === 'historico'
                    ? 'Mostrando toda la facturación registrada.'
                    : `${resumenFacturacion?.operacionesPeriodo ?? 0} operaciones en el periodo seleccionado.`}
                </p>
              </div>
            ) : null}
            <div className={styles.filterToolbar}>
              <label htmlFor="filtro-clientes" className={styles.filterLabel}>Buscar</label>
              <input
                id="filtro-clientes"
                type="search"
                className={styles.filterInput}
                placeholder="Nombre, email, teléfono o cumpleaños…"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                autoComplete="off"
              />
              <label htmlFor="filtro-vip" className={styles.filterLabel}>Estado VIP</label>
              <select
                id="filtro-vip"
                className={styles.filterSelect}
                value={filtroVip}
                onChange={(e) => setFiltroVip(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="vip">Solo VIP</option>
                <option value="normal">Sin VIP</option>
              </select>
            </div>
            <p className={styles.filterMeta}>
              Mostrando <strong>{clientesFiltrados.length}</strong> de <strong>{listaClientes.length}</strong> clientes
            </p>
          </section>

          {clientesFiltrados.length === 0 ? (
            <div className={styles.noFilterResults}>
              <p className={styles.noFilterResultsText}>
                Ningún cliente coincide con la búsqueda o el filtro VIP.
              </p>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => { setFiltroBusqueda(''); setFiltroVip('todos'); }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {clientesFiltrados.map((c) => (
                <div key={c._id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <p className={styles.cardLabel}>Cliente</p>
                      <h3 className={styles.cardName}>{c.nombre}</h3>
                    </div>
                    <div className={styles.cardHeaderActions}>
                      {c.esVip ? <span className={styles.vipBadge}>VIP</span> : null}
                      <button
                        type="button"
                        onClick={() => { setEditError(''); setClienteAEditar(c); }}
                        className={styles.editIconBtn}
                        aria-label={`Editar datos de ${c.nombre}`}
                        title="Editar cliente"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.contactGrid}>
                    {c.email ? (
                      <p className={styles.contactItem}>
                        <span className={styles.contactLabel}>Email</span>
                        <span>{c.email}</span>
                      </p>
                    ) : null}
                    {c.telefono ? (
                      <p className={styles.contactItem}>
                        <span className={styles.contactLabel}>Teléfono</span>
                        <span>{c.telefono}</span>
                      </p>
                    ) : null}
                    {!c.email && !c.telefono ? (
                      <p className={styles.infoMuted}>Sin email ni teléfono registrados</p>
                    ) : null}
                  </div>

                  {c.alarmaCuando ? (
                    <p className={styles.cardExtras}>
                      <strong>Alarma</strong>{' '}
                      {new Date(c.alarmaCuando).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      {c.alarmaDescripcion ? ` · ${c.alarmaDescripcion}` : ''}
                    </p>
                  ) : null}

                  <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                      <small>Compras {mesActualNombre}</small>
                      <div className={styles.statValueMoney}>{formatoEuro(c.ventasMesActual ?? 0)} €</div>
                      <div className={styles.statSub}>Total anual: {formatoEuro(c.ventasAnioActual ?? 0)} €</div>
                    </div>
                    <div className={styles.statBox}>
                      <small>Fecha de nacimiento</small>
                      <div className={styles.statValuePlain}>{c.cumpleanos || '---'}</div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button type="button" className={`${styles.actionBtn} ${styles.actionBtnMain}`} onClick={() => abrirModalVenta(c)}>Registrar venta</button>
                    <button type="button" className={styles.actionBtn} onClick={() => abrirModalCompras(c)}>Compras</button>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(c);
                        cargarNotasDelCliente(c._id);
                      }}
                      className={styles.actionBtn}
                    >
                      Notas
                    </button>
                    <button type="button" className={styles.actionBtn} onClick={() => abrirModalWishlist(c)}>Favoritos</button>
                    <button type="button" className={styles.actionBtn} onClick={() => abrirModalAlarma(c)}>Alarma</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

        {clienteSeleccionado && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-notas-title"
          >
            <h3 id="dialog-notas-title" className={styles.modalTitle}>Notas de seguimiento · {clienteSeleccionado.nombre}</h3>

            {/* ZONA DEL HISTORIAL */}
            <div className={styles.notasList}>
              {listaNotas.length === 0 ? (
                <p className={styles.emptyNotas}>No hay notas en el historial.</p>
              ) : (
                listaNotas.map((nota) => (
                  <div key={nota._id} className={styles.notaItem}>
                    <div className={styles.notaItemTop}>
                      <p className={styles.notaText}>{nota.contenido}</p>
                      <button
                        type="button"
                        className={styles.btnNotaBorrar}
                        onClick={() => eliminarNotaPorId(nota._id)}
                      >
                        Eliminar
                      </button>
                    </div>
                    <small className={styles.notaMeta}>
                      {nota.creadaPor?.nombre || 'Usuario'} · {formatoFechaNota(nota) || '—'}
                    </small>
                  </div>
                ))
              )}
            </div>

            {/* ZONA PARA AÑADIR NUEVA NOTA */}
            <textarea 
              className={styles.textareaNota}
              placeholder="Escribe una nueva actualización para el historial..."
              value={textoNuevaNota}
              onChange={(e) => setTextoNuevaNota(e.target.value)}
            />
            
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setClienteSeleccionado(null)} className={styles.btnSecondary} disabled={guardandoNota}>
                Cerrar
              </button>
              <button 
                type="button"
                onClick={guardarNuevaNota} 
                className={styles.btnPrimaryGreen}
                disabled={guardandoNota}
              >
                {guardandoNota ? 'Guardando…' : 'Añadir nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteComprasHistorial && (
        <div className={styles.modalOverlay}>
          <div
            className={`${styles.modalContent} ${styles.modalContentWide}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-compras-title"
          >
            <h3 id="dialog-compras-title" className={styles.modalTitle}>
              Histórico comercial · {clienteComprasHistorial.nombre}
            </h3>
            <p className={styles.modalHint}>
              Histórico comercial del cliente. Filtra por año para comparar periodos y preparar acciones de seguimiento.
            </p>
            {cargandoComprasHistorial ? (
              <p className={styles.comprasHistorialCargando} role="status">Cargando historial…</p>
            ) : (
              <>
                <div className={styles.historialSummaryGrid}>
                  <div className={styles.historialSummaryCard}>
                    <span>Total histórico</span>
                    <strong>{formatoEuro(resumenComprasHistorial.totalHistorico)} €</strong>
                  </div>
                  <div className={styles.historialSummaryCard}>
                    <span>Total {añoActual}</span>
                    <strong>{formatoEuro(resumenComprasHistorial.totalAnual)} €</strong>
                  </div>
                  <div className={styles.historialSummaryCard}>
                    <span>{mesActualNombre}</span>
                    <strong>{formatoEuro(resumenComprasHistorial.totalMes)} €</strong>
                  </div>
                </div>

                <div className={styles.historialFilterBar}>
                  <label htmlFor="historial-anio">Año</label>
                  <select
                    id="historial-anio"
                    value={filtroAnioHistorial}
                    onChange={(e) => setFiltroAnioHistorial(e.target.value)}
                  >
                    <option value="todos">Todos los años</option>
                    {resumenComprasHistorial.años.map((anio) => (
                      <option key={anio} value={String(anio)}>{anio}</option>
                    ))}
                  </select>
                  <span>
                    {filtroAnioHistorial === 'todos'
                      ? `${resumenComprasHistorial.comprasFiltradas.length} compras`
                      : `${resumenComprasHistorial.comprasFiltradas.length} compras · ${formatoEuro(resumenComprasHistorial.totalFiltro)} €`}
                  </span>
                </div>

                <div className={styles.comprasHistorialList}>
                  {listaComprasHistorial.length === 0 ? (
                    <p className={styles.emptyNotas}>No hay compras registradas para este cliente.</p>
                  ) : resumenComprasHistorial.comprasFiltradas.length === 0 ? (
                    <p className={styles.emptyNotas}>No hay compras registradas en ese año.</p>
                  ) : (
                    resumenComprasHistorial.comprasFiltradas.map((compra) => (
                      <div key={compra._id} className={styles.compraHistorialItem}>
                        <div className={styles.compraHistorialTop}>
                          <span className={styles.compraHistorialImporte}>
                            {formatoEuro(compra.importe)} €
                          </span>
                          <span className={styles.compraHistorialCanal}>
                            {CANAL_LABEL[compra.canal] || compra.canal}
                          </span>
                        </div>
                        {compra.notas ? (
                          <p className={styles.compraHistorialNotas}>{compra.notas}</p>
                        ) : null}
                        <small className={styles.notaMeta}>{formatoFechaCompra(compra.createdAt)}</small>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={cerrarModalCompras}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteAlarma && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-alarma-title"
          >
            <h3 id="dialog-alarma-title" className={styles.modalTitle}>Alarma · {clienteAlarma.nombre}</h3>
            <p className={styles.modalHint}>
              Elige cuándo quieres recordar este contacto (llamada, seguimiento, entrega…).
            </p>
            <div className={styles.modalField}>
              <label htmlFor="alarma-fecha">Fecha y hora</label>
              <input
                id="alarma-fecha"
                type="datetime-local"
                value={alarmaInputLocal}
                onChange={(e) => setAlarmaInputLocal(e.target.value)}
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="alarma-desc">Nota (opcional)</label>
              <textarea
                id="alarma-desc"
                value={alarmaDescripcion}
                onChange={(e) => setAlarmaDescripcion(e.target.value)}
                placeholder="Ej.: Llamar para tallaje / recoger pedido"
              />
            </div>
            <div className={styles.modalActionsSpread}>
              <button type="button" className={styles.btnSecondary} onClick={quitarAlarma} disabled={guardandoAlarma}>
                Quitar alarma
              </button>
              <div>
                <button type="button" className={styles.btnSecondary} onClick={cerrarModalAlarma} disabled={guardandoAlarma}>
                  Cerrar
                </button>
                <button type="button" className={styles.btnPrimaryGreen} onClick={guardarAlarma} disabled={guardandoAlarma}>
                  {guardandoAlarma ? 'Guardando…' : 'Guardar alarma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {clienteWishlist && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-wishlist-title"
          >
            <h3 id="dialog-wishlist-title" className={styles.modalTitle}>Lista de favoritos · {clienteWishlist.nombre}</h3>
            <p className={styles.modalHint}>
              Productos de interés. Puedes pegar el <strong>enlace de la ficha</strong> en la web de la empresa para abrir el producto con un clic y evitar confusiones.
            </p>
            <ul className={styles.wishlistList}>
              {wishlistDraft.length === 0 ? (
                <li className={`${styles.wishlistItem} ${styles.wishlistEmpty}`}>
                  Aún no hay productos en la lista.
                </li>
              ) : (
                wishlistDraft.map((item, idx) => (
                  <li key={`${item.nombre}-${idx}`} className={styles.wishlistItem}>
                    <div className={styles.wishlistItemBody}>
                      <span>{item.nombre}</span>
                      <span className={styles.wishlistItemMeta}>{CATEGORIA_LABEL[item.categoria] || item.categoria}</span>
                      {(item.url || '').trim() && urlWebEsValida(item.url) ? (
                        <a
                          className={styles.wishlistWebLink}
                          href={normalizarUrlWeb(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir en la web
                        </a>
                      ) : null}
                    </div>
                    <button type="button" className={styles.btnIconDanger} onClick={() => quitarProductoWishlist(idx)}>
                      Quitar
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className={styles.modalField}>
              <label htmlFor="wish-nombre">Producto o referencia</label>
              <input
                id="wish-nombre"
                type="text"
                value={newWishNombre}
                onChange={(e) => setNewWishNombre(e.target.value)}
                placeholder="Ej.: bufanda lana merino / crema manos"
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="wish-url">Enlace a la ficha (opcional)</label>
              <input
                id="wish-url"
                type="text"
                value={newWishUrl}
                onChange={(e) => setNewWishUrl(e.target.value)}
                placeholder="https://tutienda.com/producto/…"
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="wish-cat">Categoría</label>
              <select id="wish-cat" value={newWishCat} onChange={(e) => setNewWishCat(e.target.value)}>
                <option value="textil">Textil</option>
                <option value="hogar">Hogar / casas</option>
                <option value="cosmetica">Cosmética</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <button type="button" className={`${styles.btnSecondary} ${styles.btnWishlistAdd}`} onClick={añadirProductoWishlist}>
              Añadir a la lista
            </button>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={cerrarModalWishlist} disabled={guardandoWishlist}>
                Cerrar sin guardar
              </button>
              <button type="button" className={styles.btnPrimaryGreen} onClick={guardarWishlist} disabled={guardandoWishlist}>
                {guardandoWishlist ? 'Guardando…' : 'Guardar favoritos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteRegistrarVenta && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-venta-title"
          >
            <h3 id="dialog-venta-title" className={styles.modalTitle}>Registrar venta · {clienteRegistrarVenta.nombre}</h3>
            <p className={styles.modalHint}>
              Cada compra en tienda u online suma al total del cliente y al acumulado del año {añoActual}.
            </p>
            <div className={styles.modalField}>
              <label htmlFor="venta-importe">Importe (€)</label>
              <input
                id="venta-importe"
                type="text"
                inputMode="decimal"
                value={ventaImporte}
                onChange={(e) => setVentaImporte(e.target.value)}
                placeholder="Ej.: 49,90"
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="venta-canal">Canal</label>
              <select id="venta-canal" value={ventaCanal} onChange={(e) => setVentaCanal(e.target.value)}>
                <option value="tienda">Tienda física</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className={styles.modalField}>
              <label htmlFor="venta-notas">Nota interna (opcional)</label>
              <input
                id="venta-notas"
                type="text"
                value={ventaNotas}
                onChange={(e) => setVentaNotas(e.target.value)}
                placeholder="Ticket, pedido web…"
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={cerrarModalVenta} disabled={guardandoVenta}>
                Cancelar
              </button>
              <button type="button" className={styles.btnPrimaryGreen} onClick={guardarVenta} disabled={guardandoVenta}>
                {guardandoVenta ? 'Registrando…' : 'Registrar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clienteAEditar && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-editar-title"
          >
            <h3 id="dialog-editar-title" className={styles.modalTitle}>Editar datos · {clienteAEditar.nombre}</h3>
            
            <div className={styles.formColumn}>
              <input 
                placeholder="Nombre completo" 
                value={clienteAEditar.nombre} 
                onChange={e => { setEditError(''); setClienteAEditar({ ...clienteAEditar, nombre: e.target.value }); }} 
                required
                className={styles.input} 
              />
              <input 
                placeholder="Email" 
                type="email"
                value={clienteAEditar.email} 
                onChange={e => { setEditError(''); setClienteAEditar({ ...clienteAEditar, email: e.target.value }); }} 
                className={styles.input} 
              />
              <input 
                placeholder="Teléfono" 
                value={clienteAEditar.telefono} 
                onChange={e => { setEditError(''); setClienteAEditar({ ...clienteAEditar, telefono: e.target.value }); }} 
                className={styles.input} 
              />
              <input 
                placeholder="Cumpleaños" 
                value={clienteAEditar.cumpleanos} 
                onChange={e => { setEditError(''); setClienteAEditar({ ...clienteAEditar, cumpleanos: e.target.value }); }} 
                className={styles.input} 
              />
            </div>
            {editError ? <p className={styles.formError} role="alert">{editError}</p> : null}

            <div className={styles.modalActionsSpread}>
              <button
                type="button"
                className={styles.btnDangerDelete}
                onClick={eliminarClienteActual}
                disabled={guardandoEdicion || eliminandoCliente}
              >
                {eliminandoCliente ? 'Eliminando…' : 'Eliminar cliente'}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => { setEditError(''); setClienteAEditar(null); }}
                  className={styles.btnSecondary}
                  disabled={guardandoEdicion || eliminandoCliente}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarEdicionCliente}
                  className={styles.btnPrimaryOrange}
                  disabled={guardandoEdicion || eliminandoCliente}
                >
                  {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
