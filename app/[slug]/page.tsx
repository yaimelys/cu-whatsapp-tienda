'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, Phone, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio_usd: number;
  precio_cup: number;
  url_imagen: string;
  categoria: string;
}

interface Tienda {
  id: string;
  nombre_tienda: string;
  telefono_whatsapp: string;
  moneda_defecto: string;
}

interface CarritoItem {
  producto: Producto;
  cantidad: number;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function TiendaPage({ params }: PageProps) {
  const { slug } = use(params);
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      // 1. Obtener tienda
      const { data: tiendaData } = await supabase
        .from('tiendas')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tiendaData) {
        setTienda(tiendaData);
        // 2. Obtener productos de la tienda
        const { data: productosData } = await supabase
          .from('productos')
          .select('*')
          .eq('tienda_id', tiendaData.id)
          .eq('disponible', true);
        
        setProductos(productosData || []);
      }
      setCargando(false);
    }
    cargarDatos();
  }, [slug]);

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id);
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const modificarCantidad = (id: string, incremento: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === id) {
            const nuevaCantidad = item.cantidad + incremento;
            return { ...item, cantidad: nuevaCantidad };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const calcularTotal = () => {
    return carrito.reduce((acc, item) => {
      const precio = tienda?.moneda_defecto === 'USD' ? item.producto.precio_usd : item.producto.precio_cup;
      return acc + (precio * item.cantidad);
    }, 0);
  };

  const enviarPedidoWhatsApp = () => {
    if (!tienda || carrito.length === 0) return;

    let mensaje = `🛍️ *NUEVO PEDIDO - ${tienda.nombre_tienda.toUpperCase()}*\n`;
    mensaje += `-----------------------------------------\n\n`;

    carrito.forEach((item) => {
      const moneda = tienda.moneda_defecto;
      const precio = moneda === 'USD' ? item.producto.precio_usd : item.producto.precio_cup;
      mensaje += `▪️ *${item.cantidad}x* ${item.producto.nombre}\n`;
      mensaje += `   Precio: $${precio} ${moneda} c/u\n\n`;
    });

    mensaje += `-----------------------------------------\n`;
    mensaje += `💰 *TOTAL A PAGAR:* $${calcularTotal()} ${tienda.moneda_defecto}\n\n`;
    mensaje += `📱 _Pedido generado automáticamente desde tu catálogo web_`;

    const url = `https://wa.me/${tienda.telefono_whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Cargando catálogo optimizado...</div>;
  }

  if (!tienda) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">Tienda no encontrada.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans max-w-md mx-auto relative pb-24">
      {/* Encabezado Estilo App */}
      <header className="sticky top-0 bg-slate-800/95 backdrop-blur-md p-4 border-b border-slate-700 flex justify-between items-center z-40">
        <div>
          <h1 className="text-xl font-black text-amber-400 tracking-tight uppercase">{tienda.nombre_tienda}</h1>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Catálogo Conexión Ligera
          </p>
        </div>
        <a href={`tel:${tienda.telefono_whatsapp}`} className="bg-slate-700 p-2.5 rounded-full text-slate-200 active:scale-95 transition-transform">
          <Phone size={18} />
        </a>
      </header>

      {/* Grid de Productos - Dos Columnas Compacto para Móvil */}
      <main className="p-3 grid grid-cols-2 gap-3">
        {productos.map((prod) => (
          <div key={prod.id} className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col justify-between">
            <div className="aspect-square bg-slate-700 relative w-full flex items-center justify-center text-xs text-slate-400">
              {/* Espacio para imagen de Cloudinary */}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-800 border-b border-slate-700">🖼️ Foto Comprimida</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100 leading-snug line-clamp-2">{prod.nombre}</h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{prod.descripcion}</p>
              </div>
              <div className="mt-3">
                <div className="flex flex-col mb-2">
                  <span className="text-amber-400 font-black text-base leading-none">${prod.precio_usd} USD</span>
                  {prod.precio_cup && (
                    <span className="text-[10px] text-slate-400 mt-0.5">${prod.precio_cup.toLocaleString()} CUP</span>
                  )}
                </div>
                <button 
                  onClick={() => agregarAlCarrito(prod)}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Barra de Carrito Flotante Inferior */}
      {carrito.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-850 border-t border-slate-700 p-4 shadow-2xl z-50 backdrop-blur-lg bg-slate-800/90">
          <div className="flex justify-between items-center">
            <button onClick={() => setVerCarrito(true)} className="flex items-center gap-2 text-left">
              <div className="relative bg-amber-500 text-slate-950 p-2.5 rounded-xl">
                <ShoppingCart size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full">{carrito.reduce((a, b) => a + b.cantidad, 0)}</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Tu pedido</p>
                <p className="text-sm font-bold text-slate-100">${calcularTotal()} {tienda.moneda_defecto}</p>
              </div>
            </button>
            <button 
              onClick={enviarPedidoWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-3 px-5 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/20"
            >
              <ShoppingBag size={14} /> Confirmar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Desplegable Detalle de Carrito (Modal) */}
      {verCarrito && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm animate-fade-in" onClick={() => setVerCarrito(false)}>
          <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-black uppercase text-slate-200 flex items-center gap-2"><ShoppingCart size={18}/> Revisar Productos</h2>
              <button onClick={() => setVerCarrito(false)} className="text-xs bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold">Cerrar</button>
            </div>
            <div className="divide-y divide-slate-700/60 max-h-[40vh] overflow-y-auto pr-1">
              {carrito.map((item) => (
                <div key={item.producto.id} className="py-3 flex justify-between items-center">
                  <div className="max-w-[60%]">
                    <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{item.producto.nombre}</h4>
                    <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                      ${tienda.moneda_defecto === 'USD' ? item.producto.precio_usd : item.producto.precio_cup} {tienda.moneda_defecto}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 bg-slate-900 p-1.5 rounded-xl border border-slate-700/50">
                    <button onClick={() => modificarCantidad(item.producto.id, -1)} className="text-slate-400 hover:text-red-400 p-1"><Minus size={12}/></button>
                    <span className="font-bold text-xs w-4 text-center">{item.cantidad}</span>
                    <button onClick={() => modificarCantidad(item.producto.id, 1)} className="text-slate-400 hover:text-emerald-400 p-1"><Plus size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700 mt-4 pt-4 flex justify-between items-center mb-2">
              <span className="text-xs uppercase font-bold text-slate-400">Total Neto:</span>
              <span className="text-lg font-black text-emerald-400">${calcularTotal()} {tienda.moneda_defecto}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}