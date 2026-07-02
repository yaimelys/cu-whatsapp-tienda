'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit2, Trash2, LogOut, Check, X, Tag, Package, Eye, Layers } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  precio_usd: number;
  precio_cup: number;
  categoria: string;
  disponible: boolean;
  url_imagen?: string;
}

// LISTA DE CATEGORÍAS GENERALIZADAS PARA EL MERCADO
const CATEGORIAS_ESTANDAR = [
  "Electrodomésticos",
  "Celulares y Accesorios",
  "Ropa y Calzado",
  "Belleza y Salud",
  "Ferreteria",
  "Juguetes y Pasatiempos",
  "Alimentos y Bebidas",
  "Otros"
];

function ContenidoPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('t');

  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [nombreTienda, setNombreTienda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el Formulario (Crear / Editar)
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [precioUsd, setPrecioUsd] = useState('');
  const [precioCup, setPrecioCup] = useState('');
  // Inicializamos con la primera categoría de la lista oficial
  const [categoria, setCategoria] = useState(CATEGORIAS_ESTANDAR[0]);
  const [disponible, setDisponible] = useState(true);
  const [urlImagen, setUrlImagen] = useState('');

  useEffect(() => {
    async function verificarAcceso() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      if (!slug) {
        router.push('/');
        return;
      }

      const { data: tienda } = await supabase
        .from('tiendas')
        .select('*')
        .eq('slug', slug)
        .eq('user_id', session.user.id)
        .single();

      if (!tienda) {
        router.push('/');
        return;
      }

      setTiendaId(tienda.id);
      setNombreTienda(tienda.nombre_tienda);
      cargarProductos(tienda.id);
    }

    verificarAcceso();
  }, [slug, router]);

  async function cargarProductos(idTienda: string) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', idTienda)
      .order('categoria', { ascending: true }); // Orden seguro corregido
    
    if (error) {
      console.error("🚨 Error crítico de Supabase cargando productos:", error.message);
    }
    
    setProductos(data || []);
    setCargando(false);
  }

  const prepararEdicion = (p: Producto) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecioUsd(p.precio_usd.toString());
    setPrecioCup(p.precio_cup.toString());
    
    // Si la categoría vieja no está en la lista nueva, forzar una válida para que no se rompa el select
    setCategoria(CATEGORIAS_ESTANDAR.includes(p.categoria) ? p.categoria : CATEGORIAS_ESTANDAR[0]);
    
    setDisponible(p.disponible);
    setUrlImagen(p.url_imagen || '');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre('');
    setPrecioUsd('');
    setPrecioCup('');
    setCategoria(CATEGORIAS_ESTANDAR[0]); // Resetea a la primera opción por defecto
    setDisponible(true);
    setUrlImagen('');
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiendaId) return;

    const datosProducto = {
      nombre: nombre.trim(),
      precio_usd: parseFloat(precioUsd) || 0,
      precio_cup: parseFloat(precioCup) || 0,
      categoria: categoria, // Directamente el valor controlado por el select
      disponible,
      url_imagen: urlImagen.trim() || null,
      tienda_id: tiendaId
    };

    try {
      if (editandoId) {
        const { error } = await supabase
          .from('productos')
          .update(datosProducto)
          .eq('id', editandoId);

        if (error) throw error;
        alert("¡Producto actualizado con éxito!");
      } else {
        const { error } = await supabase
          .from('productos')
          .insert([datosProducto]);

        if (error) throw error;
        alert("¡Producto añadido con éxito!");
      }

      limpiarFormulario();
      cargarProductos(tiendaId);
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este producto permanentemente?")) return;
    
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      if (tiendaId) cargarProductos(tiendaId);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (cargando) return <div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-xs flex items-center justify-center font-mono">CARGANDO PANEL DE CONTROL...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans max-w-4xl mx-auto p-4 md:p-6 pb-24">
      
      {/* HEADER DEL PANEL */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 rounded-3xl p-6 gap-4 mb-8 shadow-xl">
        <div>
          <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Consola de Administración</p>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">{nombreTienda}</h1>
          <button 
            onClick={() => window.open(`/?t=${slug}`, '_blank')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mt-1 transition-colors"
          >
            <Eye size={12} /> Ver tu tienda pública
          </button>
        </div>
        <button 
          onClick={cerrarSesion}
          className="bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 text-slate-400 hover:text-rose-400 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 self-end sm:self-auto"
        >
          <LogOut size={14} /> Salir
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* FORMULARIO DINÁMICO CON SELECT ACTUALIZADO */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg h-max">
          <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
            {editandoId ? <Edit2 size={16} className="text-cyan-400" /> : <Plus size={16} className="text-amber-400" />}
            {editandoId ? "Editar Producto" : "Nuevo Producto"}
          </h2>

          <form onSubmit={guardarProducto} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Nombre del artículo</label>
              <input
                type="text"
                placeholder="Ej. Tenis Nike Air Max"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Precio USD</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={precioUsd}
                  onChange={(e) => setPrecioUsd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Precio CUP</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={precioCup}
                  onChange={(e) => setPrecioCup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* SELECCIÓN DE CATEGORÍAS ESTÁNDAR (REEMPLAZA AL INPUT DE TEXTO) */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Categoría</label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
                  required
                >
                  {CATEGORIAS_ESTANDAR.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <Layers size={12} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Enlace de la Imagen (URL)</label>
              <input
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={urlImagen}
                onChange={(e) => setUrlImagen(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Disponible para la venta</span>
              <input
                type="checkbox"
                checked={disponible}
                onChange={(e) => setDisponible(e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className={`flex-1 text-slate-950 font-black text-xs py-2.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${editandoId ? 'bg-cyan-400 hover:bg-cyan-500' : 'bg-amber-400 hover:bg-amber-500'}`}
              >
                {editandoId ? <>Actualizar <Check size={14} /></> : <>Añadir <Plus size={14} /></>}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-3 rounded-xl transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTADO DE PRODUCTOS */}
        <div className="md:col-span-3 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 px-1 mb-1">Tus Mercancías ({productos.length})</h2>
          
          {productos.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs font-mono">
              NO HAS REGISTRADO NINGÚN PRODUCTO TODAVÍA.
            </div>
          ) : (
            productos.map((p) => (
              <div 
                key={p.id} 
                className={`bg-slate-900 border ${editandoId === p.id ? 'border-cyan-500/80 ring-1 ring-cyan-500/30' : 'border-slate-800/70'} rounded-2xl p-3 flex items-center justify-between gap-4 shadow-sm transition-all`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {p.url_imagen ? (
                      <img src={p.url_imagen} alt={p.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={16} className="text-slate-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-white tracking-tight truncate max-w-[180px] sm:max-w-[260px]">{p.nombre}</h3>
                    
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono font-black">
                      {p.precio_usd > 0 && <span className="text-amber-400">${p.precio_usd} <span className="text-[8px] text-slate-500 font-sans font-normal uppercase">usd</span></span>}
                      {p.precio_usd > 0 && p.precio_cup > 0 && <span className="text-slate-700 font-sans font-normal">|</span>}
                      {p.precio_cup > 0 && <span className="text-slate-200">${p.precio_cup.toLocaleString()} <span className="text-[8px] text-slate-500 font-sans font-normal uppercase">cup</span></span>}
                    </div>
                    
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded-md mt-1.5">
                      <Tag size={8} /> {p.categoria}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => prepararEdicion(p)}
                    title="Editar producto"
                    className="w-8 h-8 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-cyan-400 border border-slate-800 rounded-xl flex items-center justify-center transition-all"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => eliminarProducto(p.id)}
                    title="Eliminar producto"
                    className="w-8 h-8 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl flex items-center justify-center transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default function PanelAdministrador() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-xs flex items-center justify-center font-mono">Cargando la consola segura...</div>}>
      <ContenidoPanel />
    </Suspense>
  );
}