'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Store, Lock, Mail, ArrowRight, UserPlus, LogIn, Phone, ShoppingCart, MessageSquare, PackageOpen, Tag, Sparkles, Layers, Check } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  precio_usd: number;
  precio_cup: number;
  categoria: string;
  disponible: boolean;
  url_imagen?: string;
}

interface Tienda {
  id: string;
  nombre_tienda: string;
  slug: string;
  telefono_whatsapp: string;
}

function ContenidoRaiz() {
  const router = useRouter();
  
  // Modos de pantalla
  const [esCatalogoCliente, setEsCatalogoCliente] = useState(false);
  const [esRegistro, setEsRegistro] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estados del Cliente (Catálogo)
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<{ [key: string]: number }>({});

  // Estados del Vendedor (Login/Registro)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreTienda, setNombreTienda] = useState('');
  const [slugParam, setSlugParam] = useState('');
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('');

  useEffect(() => {
    async function inicializarRuta() {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const tiendaSlug = queryParams.get('t');

        if (tiendaSlug) {
          setEsCatalogoCliente(true);
          
          const { data: tiendaData } = await supabase
            .from('tiendas')
            .select('*')
            .eq('slug', tiendaSlug)
            .single();

          if (tiendaData) {
            setTienda(tiendaData);
            const { data: productosData } = await supabase
              .from('productos')
              .select('*')
              .eq('tienda_id', tiendaData.id)
              .order('categoria', { ascending: true });
            
            setProductos(productosData || []);
          }
          setCargando(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: tiendaVendedor } = await supabase
            .from('tiendas')
            .select('slug')
            .eq('user_id', session.user.id)
            .single();

          if (tiendaVendedor) {
            router.push(`/panel?t=${tiendaVendedor.slug}`);
            return;
          }
        }
        
        setCargando(false);
      } catch (err) {
        console.error(err);
        setCargando(false);
      }
    }
    inicializarRuta();
  }, [router]);

  const actualizarCantidad = (id: string, cambio: number) => {
    setCarrito(prev => {
      const nuevaCant = (prev[id] || 0) + cambio;
      if (nuevaCant <= 0) {
        const { [id]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [id]: nuevaCant };
    });
  };

  const enviarPedidoWhatsApp = () => {
    if (!tienda || Object.keys(carrito).length === 0) return;

    let mensaje = `🛍️ *NUEVO PEDIDO - ${tienda.nombre_tienda.toUpperCase()}* 🛍️\n`;
    mensaje += `=========================================\n\n`;
    let totalUSD = 0;
    let totalCUP = 0;

    Object.entries(carrito).forEach(([id, cant]) => {
      const p = productos.find(prod => prod.id === id);
      if (p) {
        mensaje += `📌 *${cant}x* ${p.nombre}\n`;
        if (p.precio_usd > 0) {
          mensaje += `   💵 Precio: $${p.precio_usd} USD c/u ➔ *$${p.precio_usd * cant} USD*\n`;
          totalUSD += p.precio_usd * cant;
        }
        if (p.precio_cup > 0) {
          mensaje += `   🇨🇺 Precio: $${p.precio_cup.toLocaleString()} CUP c/u ➔ *$${(p.precio_cup * cant).toLocaleString()} CUP*\n`;
          totalCUP += p.precio_cup * cant;
        }
        mensaje += `\n`;
      }
    });

    mensaje += `=========================================\n`;
    mensaje += `💰 *TOTAL ESTIMADO EN CAJA:*`;
    if (totalUSD > 0) mensaje += `\n💵 *${totalUSD} USD*`;
    if (totalCUP > 0) mensaje += `\n🇨🇺 *${totalCUP.toLocaleString()} CUP*`;

    const url = `https://wa.me/${tienda.telefono_whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const manejarAutenticacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCargando(true);

    try {
      if (esRegistro) {
        if (!nombreTienda || !slugParam || !telefonoWhatsapp) {
          alert("Introduce todos los datos requeridos.");
          setCargando(false);
          return;
        }
        const slugLimpio = slugParam.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const { error: tiendaError } = await supabase.from('tiendas').insert([
          { nombre_tienda: nombreTienda, slug: slugLimpio, telefono_whatsapp: telefonoWhatsapp.trim(), user_id: authData.user?.id }
        ]);
        if (tiendaError) throw tiendaError;

        alert("¡Cuenta creada!");
        router.push(`/panel?t=${slugLimpio}`);
      } else {
        const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        
        if (authData.user) {
          const { data: t } = await supabase.from('tiendas').select('slug').eq('user_id', authData.user.id).single();
          if (t) router.push(`/panel?t=${t.slug}`);
        }
      }
    } catch (err: any) {
      alert(err.message || "Error en el acceso.");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-xs flex items-center justify-center font-mono tracking-widest animate-pulse">CARGANDO CATALOG SYSTEM...</div>;

  // ================= VISTA LUXURY RESTAURADA AL 100% =================
  if (esCatalogoCliente) {
    if (!tienda) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-400 p-6 flex flex-col items-center justify-center text-center">
          <PackageOpen size={42} className="text-rose-500 mb-3" />
          <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">Tienda Desconectada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">El escaparate no coincide con credenciales activas.</p>
        </div>
      );
    }

    const categorias = Array.from(new Set(productos.map(p => p.categoria)));
    const totalArticulosCarrito = Object.values(carrito).reduce((a, b) => a + b, 0);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans max-w-md mx-auto px-3 pt-6 pb-32 selection:bg-amber-400 selection:text-slate-950">
        
        {/* BANNER ORIGINAL PREMIUM CON LUZ DE FONDO */}
        <header className="mb-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-1.5 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
              Escaparate Virtual <Sparkles size={10} className="text-amber-400" />
            </p>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{tienda.nombre_tienda}</h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">Selecciona tus artículos y confirma la orden directo a nuestro WhatsApp.</p>
        </header>

        {/* LISTADO DE CATEGORÍAS */}
        {productos.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
            Sin productos públicos disponibles.
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat} className="mb-8">
              {/* Separador de Categorías Impecable */}
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <Layers size={11} /> {cat}
                </h2>
                <div className="h-[1px] bg-slate-900/60 flex-1" />
              </div>
              
              {/* GRID DE DOS COLUMNAS DE ALTA VISIBILIDAD */}
              <div className="grid grid-cols-2 gap-3">
                {productos.filter(p => p.categoria === cat).map(p => (
                  <div 
                    key={p.id} 
                    className={`bg-slate-900 border ${p.disponible ? 'border-slate-800/60 shadow-lg' : 'border-slate-900/40 opacity-50'} rounded-2xl p-2.5 flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-700`}
                  >
                    
                    {/* Contenedor de Imagen con Formato Vertical Estilizado */}
                    <div className="w-full aspect-[4/4] bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center overflow-hidden relative mb-2.5 shadow-inner">
                      {p.url_imagen ? (
                        <img src={p.url_imagen} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <Store size={22} className="text-slate-800" />
                      )}
                      
                      {/* Capa de Precios Flotante Superior de Alta Visibilidad */}
                      {p.disponible && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-950/70 backdrop-blur-md rounded-lg p-1 border border-slate-800/40 flex flex-wrap gap-x-1.5 gap-y-0.5 justify-center text-center">
                          {p.precio_usd > 0 && (
                            <span className="text-[11px] font-black text-amber-400 font-mono">${p.precio_usd} <span className="text-[8px] text-slate-400 uppercase font-sans">usd</span></span>
                          )}
                          {p.precio_cup > 0 && (
                            <span className="text-[11px] font-black text-slate-100 font-mono">${p.precio_cup.toLocaleString()} <span className="text-[8px] text-slate-400 uppercase font-sans">cup</span></span>
                          )}
                        </div>
                      )}

                      {/* Badge de Agotado */}
                      {!p.disponible && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded-md">Agotado</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Información e Identificación del Producto */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="px-0.5">
                        <h3 className="font-bold text-xs text-slate-200 tracking-tight leading-snug line-clamp-2 min-h-[2.2rem]">{p.nombre}</h3>
                      </div>
                      
                      {/* Controladores de Pedido Dinámicos */}
                      <div className="mt-2 pt-2 border-t border-slate-850">
                        {p.disponible && (
                          carrito[p.id] ? (
                            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
                              <button onClick={() => actualizarCantidad(p.id, -1)} className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black rounded-lg">-</button>
                              <span className="text-xs font-mono font-bold text-amber-400 w-4 text-center">{carrito[p.id]}</span>
                              <button onClick={() => actualizarCantidad(p.id, 1)} className="w-6 h-6 bg-amber-400 text-slate-950 hover:bg-amber-500 text-xs font-black rounded-lg">+</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => actualizarCantidad(p.id, 1)}
                              className="w-full bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider py-1.5 rounded-xl transition-all border border-slate-800 shadow-sm"
                            >
                              Pedir
                            </button>
                          )
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* BOTÓN FLOTANTE ORIGINAL DE WHATSAPP */}
        {totalArticulosCarrito > 0 && (
          <div className="fixed bottom-5 left-4 right-4 max-w-sm mx-auto z-50">
            <button 
              onClick={enviarPedidoWhatsApp}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-98 text-slate-950 font-black text-xs py-3.5 rounded-2xl transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl border border-emerald-400/20"
            >
              <ShoppingCart size={15} /> Confirmar orden por WhatsApp ({totalArticulosCarrito}) <MessageSquare size={15} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= VISTA: LOGIN / REGISTRO VENDEDORES =================
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200" suppressHydrationWarning>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <header className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-400/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-400/20">
            <Store size={24} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            {esRegistro ? "Únete como Vendedor" : "Consola de Vendedores"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {esRegistro ? "Crea tu cuenta y monta tu tienda en 30 segundos" : "Gestiona tus mercancías y genera tus catálogos"}
          </p>
        </header>

        <form onSubmit={manejarAutenticacion} className="space-y-4">
          {esRegistro && (
            <div className="space-y-4 border-b border-slate-800 pb-4 mb-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Nombre Comercial de la Tienda</label>
                <input
                  type="text"
                  placeholder="Ej. Taller Osmarito"
                  value={nombreTienda}
                  onChange={(e) => setNombreTienda(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Número de WhatsApp (con código de país)</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 gap-2 focus-within:border-amber-400 transition-colors">
                  <Phone size={14} className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Ej. 5351234567"
                    value={telefonoWhatsapp}
                    onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                    className="w-full bg-transparent border-none py-2.5 text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Enlace deseado (Slug único sin espacios)</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5">
                  <span className="text-[11px] text-slate-600 font-mono select-none">t=</span>
                  <input
                    type="text"
                    placeholder="taller-osmarito"
                    value={slugParam}
                    onChange={(e) => setSlugParam(e.target.value)}
                    className="w-full bg-transparent border-none py-2.5 pl-0.5 text-xs font-mono text-amber-400 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Correo Electrónico</label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 gap-2 focus-within:border-amber-400 transition-colors">
              <Mail size={14} className="text-slate-500" />
              <input
                type="email"
                placeholder="vendedor@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-none py-2.5 text-xs text-slate-200 focus:outline-none"
                required
                suppressHydrationWarning
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Contraseña</label>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 gap-2 focus-within:border-amber-400 transition-colors">
              <Lock size={14} className="text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none py-2.5 text-xs text-slate-200 focus:outline-none"
                required
                suppressHydrationWarning
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {esRegistro ? <>Crear mi Tienda <UserPlus size={14} /></> : <>Entrar al Panel <LogIn size={14} /></>}
          </button>
        </form>

        <footer className="mt-5 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-xs text-amber-400/80 hover:text-amber-400 font-medium inline-flex items-center gap-1"
          >
            {esRegistro ? "¿Ya tienes una cuenta registrada? Inicia Sesión" : "¿Quieres vender? Regístrate y crea tu tienda"}
            <ArrowRight size={12} />
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function RaizEcosistema() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-xs flex items-center justify-center font-mono">Cargando pasarela...</div>}>
      <ContenidoRaiz />
    </Suspense>
  );
}