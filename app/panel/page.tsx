'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Check, Eye, EyeOff, RefreshCw, ShoppingBag } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  precio_usd: number;
  precio_cup: number;
  categoria: string;
  disponible: boolean;
}

interface Tienda {
  id: string;
  nombre_tienda: string;
  slug: string;
}

export default function PanelVendedor() {
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [textoCopiado, setTextoCopiado] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Hardcodeamos temporalmente el slug para las pruebas de desarrollo
  const SLUG_PRUEBA = 'bazar-onder'; 

  useEffect(() => {
    async function cargarDatosPanel() {
      const { data: tiendaData } = await supabase
        .from('tiendas')
        .select('*')
        .eq('slug', SLUG_PRUEBA)
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
    }
    cargarDatosPanel();
  }, []);

  const alternarDisponibilidad = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    
    // Actualización optimista en interfaz
    setProductos(prev => prev.map(p => p.id === id ? { ...p, disponible: nuevoEstado } : p));

    // Guardar en Supabase
    await supabase
      .from('productos')
      .update({ disponible: nuevoEstado })
      .eq('id', id);
  };

  const generarPegoteTexto = () => {
    if (!tienda || productos.length === 0) return '';

    let texto = `🛍️ *¡PRODUCTOS DISPONIBLES EN ${tienda.nombre_tienda.toUpperCase()}!* 🛍️\n`;
    texto += `⚡ _Pide directo a mi WhatsApp antes de que se agoten_ ⚡\n\n`;

    // Agrupar productos por categoría
    const categorias = Array.from(new Set(productos.filter(p => p.disponible).map(p => p.categoria)));

    categorias.forEach(cat => {
      texto += `🔹 *${cat.toUpperCase()}*\n`;
      const prodsDeCat = productos.filter(p => p.categoria === cat && p.disponible);
      
      prodsDeCat.forEach(p => {
        texto += `• ${p.nombre} ➔ *$${p.precio_usd} USD*`;
        if (p.precio_cup) {
          texto += ` _(ó $${p.precio_cup.toLocaleString()} CUP)_`;
        }
        texto += `\n`;
      });
      texto += `\n`;
    });

    texto += `-----------------------------------------\n`;
    texto += `📸 *¿Quieres ver fotos de todo y armar tu carrito rápido? Entra aquí sin gastar megas:* \n`;
    texto += `👉 http://localhost:3000/${tienda.slug}`; // En producción cambiar por dominio real

    return texto;
  };

  const copiarAlPortapapeles = () => {
    const texto = generarPegoteTexto();
    navigator.clipboard.writeText(texto);
    setTextoCopiado(true);
    setTimeout(() => setTextoCopiado(false), 2500);
  };

  if (cargando) return <div className="min-h-screen bg-slate-950 text-slate-400 p-6 text-sm">Cargando panel de control...</div>;
  if (!tienda) return <div className="min-h-screen bg-slate-950 text-red-400 p-6 text-sm">Error cargando tienda administrativa.</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans max-w-xl mx-auto p-4 pb-12">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-black text-amber-400 uppercase tracking-tight">Panel Administrativo</h1>
        <p className="text-xs text-slate-400 mt-0.5">Gestión de inventario para: {tienda.nombre_tienda}</p>
      </header>

      {/* SECCIÓN 1: Generador de Texto para Grupos */}
      <section className="bg-slate-900 rounded-2xl border border-slate-800 p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag size={16}/> Copiar Texto para WhatsApp
          </h2>
          <button 
            onClick={copiarAlPortapapeles}
            className={`text-xs font-black py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors ${textoCopiado ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950 hover:bg-amber-500'}`}
          >
            {textoCopiado ? (<><Check size={14}/> ¡Copiado!</>) : (<><Copy size={14}/> Copiar Lista</>)}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Este es el texto limpio que vas a pegar en tus grupos de WhatsApp. Los productos ocultos no saldrán en la lista.</p>
        <textarea 
          readOnly 
          value={generarPegoteTexto()} 
          className="w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none resize-none"
        />
      </section>

      {/* SECCIÓN 2: Lista de Control de Inventario */}
      <section className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Control Rápido de Stock</h2>
        <div className="space-y-3">
          {productos.map((p) => (
            <div key={p.id} className={`p-3 rounded-xl border flex justify-between items-center transition-colors ${p.disponible ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-900/60 opacity-60'}`}>
              <div>
                <h3 className={`font-bold text-xs ${p.disponible ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{p.nombre}</h3>
                <p className="text-[11px] text-amber-400 font-semibold mt-1">${p.precio_usd} USD <span className="text-slate-500 font-normal">/ ${p.precio_cup?.toLocaleString()} CUP</span></p>
              </div>
              <button 
                onClick={() => alternarDisponibilidad(p.id, p.disponible)}
                className={`py-2 px-3 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-colors ${p.disponible ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-900 text-slate-600 hover:bg-slate-800'}`}
              >
                {p.disponible ? (<><Eye size={12}/> Visible</>) : (<><EyeOff size={12}/> Oculto</>)}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}