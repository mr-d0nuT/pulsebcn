"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Star, Send } from 'lucide-react';

// 1. TU BACKEND DE REVIEWS (Google Sheets)
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwrfFDz4ffbYEBjor4jRZazCQxsvrejKp3aJYYVIQCO3gMai0oZTQaN18pn7AUObqO0/exec";

// 2. EL ENDPOINT DIARIO
const AGENDA_DIARIA_URL = "https://opendata-ajuntament.barcelona.cat/data/api/action/datastore_search?resource_id=877ccf66-9106-4ae2-be51-95a9f6469e4c&limit=300";

export default function MapViewer() {
  const [eventos, setEventos] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [enviando, setEnviando] = useState(false);

  // 🛡️ ESCUDO DE DATOS: Previene el error "Objects are not valid as a React child"
  const textoSeguro = (valor, porDefecto) => {
    if (!valor) return porDefecto;
    // Si la API manda un objeto en lugar de texto, lo neutralizamos
    if (typeof valor === 'object') return porDefecto; 
    return String(valor);
  };

  useEffect(() => {
    const fetchAgendaHoy = async () => {
      try {
        const res = await fetch(AGENDA_DIARIA_URL);
        const data = await res.json();
        
        const records = data.result.records
          .filter(r => r.geo_epgs_4326_lat && r.geo_epgs_4326_lon) 
          .map(r => {
            // Pasamos todos los campos vulnerables por el Escudo
            const dir = textoSeguro(r.addresses_main_address, "");
            const dist = textoSeguro(r.addresses_district_name, "");
            
            return {
              id: r._id,
              name: textoSeguro(r.name, "Esdeveniment sense nom"),
              pos: [parseFloat(r.geo_epgs_4326_lat), parseFloat(r.geo_epgs_4326_lon)],
              categoria: textoSeguro(r.secondary_filters_name, "Esdeveniment"),
              horari: textoSeguro(r.timetable, "Horari no especificat"),
              direccion: dir ? `${dir} ${dist ? `(${dist})` : ''}` : "Barcelona"
            };
          });
        
        setEventos(records);
      } catch (e) { 
        console.error("Error cargando la agenda diaria", e); 
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch(GOOGLE_SHEETS_API_URL);
        const data = await res.json();
        if (Array.isArray(data)) setReviews(data);
      } catch (e) { 
        console.error("Error cargando reviews del Sheet", e); 
      }
    };

    fetchAgendaHoy();
    fetchReviews();
  }, []);

  const enviarReview = async (evento_id, e) => {
    e.preventDefault();
    if(!nuevoUsuario.trim() || !nuevoComentario.trim()) return;
    setEnviando(true);
    
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          evento_id: evento_id,
          usuario: nuevoUsuario,
          estrellas: 5,
          comentario: nuevoComentario
        })
      });
      
      setReviews(prev => [...prev, { 
        evento_id: evento_id, 
        usuario: nuevoUsuario, 
        estrellas: 5, 
        comentario: nuevoComentario 
      }]);
      
      setNuevoComentario("");
      setNuevoUsuario("");
    } catch (error) {
      console.error("Error al enviar", error);
    } finally {
      setEnviando(false);
    }
  };

  const eventIcon = L.divIcon({ 
    html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(37,99,235,0.8);"></div>`, 
    className: 'custom-icon' 
  });

  return (
    <div className="h-screen w-screen absolute inset-0 bg-[#0f172a]">
      <MapContainer center={[41.387, 2.170]} zoom={13} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; Open Data BCN' />
        
        {eventos.map(ev => {
          const evReviews = reviews.filter(r => r.evento_id === ev.id.toString());
          
          return (
            <Marker key={ev.id} position={ev.pos} icon={eventIcon}>
              <Popup className="w-[280px]">
                <div className="font-sans text-slate-800 m-[-4px]">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{ev.categoria}</p>
                  <h3 className="font-black text-[14px] mb-1 text-[#1e3a8a] leading-tight">{ev.name}</h3>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">📍 {ev.direccion}</p>
                  <p className="text-[11px] font-bold text-slate-500 mb-3 border-b border-slate-200 pb-2">🕒 {ev.horari}</p>
                  
                  <div className="bg-[#f8fafc] p-2 rounded-lg mt-2 border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase mb-2 flex items-center gap-1">
                      <Star size={12} className="text-amber-500" /> Estat en viu ({evReviews.length})
                    </h4>
                    
                    <div className="max-h-24 overflow-y-auto space-y-1.5 mb-3 pr-1">
                      {evReviews.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Cap comentari encara. Hi ha molta gent?</p>
                      ) : (
                        evReviews.map((rev, idx) => (
                          <div key={idx} className="bg-white p-1.5 rounded shadow-sm border border-slate-100">
                            <span className="font-bold text-[10px] text-blue-600">@{rev.usuario}: </span>
                            <span className="text-[10px] text-slate-600 leading-tight">{rev.comentario}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={(e) => enviarReview(ev.id.toString(), e)} className="flex flex-col gap-1.5 border-t border-slate-200 pt-2">
                      <input type="text" placeholder="El teu àlies..." className="text-[11px] p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" value={nuevoUsuario} onChange={e => setNuevoUsuario(e.target.value)} disabled={enviando} required />
                      <div className="flex gap-1.5">
                        <input type="text" placeholder="Què està passant ara?" className="text-[11px] p-1.5 border border-slate-300 rounded flex-grow focus:outline-none focus:border-blue-500" value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} disabled={enviando} required />
                        <button type="submit" disabled={enviando} className={`text-white px-3 rounded flex items-center justify-center font-bold ${enviando ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}><Send size={12} /></button>
                      </div>
                    </form>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  );
}
