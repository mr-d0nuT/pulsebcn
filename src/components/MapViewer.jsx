"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Star, Send } from 'lucide-react';

// === TU API DE GOOGLE SHEETS ===
const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwrfFDz4ffbYEBjor4jRZazCQxsvrejKp3aJYYVIQCO3gMai0oZTQaN18pn7AUObqO0/exec";

export default function MapViewer() {
  const [eventos, setEventos] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // 1. Obtener Eventos Oficiales de Barcelona Open Data
    const fetchBarnaData = async () => {
      try {
        const res = await fetch('https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=e7041793-6c8c-4f10-9080-33b09228a0f9&limit=100');
        const data = await res.json();
        const records = data.result.records.filter(r => r.lat && r.lon).map(r => ({
            id: r._id,
            name: r.name,
            pos: [parseFloat(r.lat), parseFloat(r.lon)],
            info: r.description || "Sin descripción disponible",
            horari: r.prox_ses_horari || "Ver detalle oficial"
        }));
        setEventos(records);
      } catch (e) { console.error("Error Open Data", e); }
    };

    // 2. Obtener Reviews Comunitarias de tu Google Sheet
    const fetchReviews = async () => {
      try {
        const res = await fetch(GOOGLE_SHEETS_API_URL);
        const data = await res.json();
        setReviews(data);
      } catch (e) { console.error("Error cargando reviews del Sheet", e); }
    };

    fetchBarnaData();
    fetchReviews();
  }, []);

  const enviarReview = async (evento_id, e) => {
    e.preventDefault();
    if(!nuevoUsuario || !nuevoComentario) {
      alert("Por favor, introduce tu alias y un comentario.");
      return;
    }
    setEnviando(true);
    
    try {
      // Usamos mode: 'no-cors' para evitar bloqueos del navegador hacia Google Apps Script
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          evento_id: evento_id,
          usuario: nuevoUsuario,
          estrellas: 5,
          comentario: nuevoComentario
        })
      });
      
      // Actualizamos la vista inmediatamente para que el usuario vea su review
      setReviews([...reviews, { 
        evento_id: evento_id, 
        usuario: nuevoUsuario, 
        estrellas: 5, 
        comentario: nuevoComentario 
      }]);
      
      setNuevoComentario("");
      setNuevoUsuario("");
    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar la review al servidor.");
    }
    setEnviando(false);
  };

  const eventIcon = L.divIcon({ 
    html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(37,99,235,0.8);"></div>`, 
    className: 'event-marker' 
  });

  return (
    <div className="h-screen w-screen absolute inset-0 bg-slate-900">
      <MapContainer center={[41.387, 2.170]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {eventos.map(ev => {
          // Extraemos solo las reviews de este punto en concreto
          const evReviews = reviews.filter(r => r.evento_id === ev.id.toString());
          
          return (
            <Marker key={ev.id} position={ev.pos} icon={eventIcon}>
              <Popup className="w-72">
                <div className="font-sans text-slate-800">
                  <h3 className="font-black text-sm mb-1 text-blue-900 leading-tight">{ev.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mb-2">🕒 {ev.horari}</p>
                  
                  {/* === ZONA SOCIAL (CONECTADA A GOOGLE SHEETS) === */}
                  <div className="bg-slate-100 p-2 rounded-lg mt-3">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2 border-b border-slate-300 pb-1 flex items-center gap-1">
                      <Star size={10} className="text-yellow-500" /> Comunidad en vivo ({evReviews.length})
                    </h4>
                    
                    <div className="max-h-24 overflow-y-auto space-y-2 mb-2">
                      {evReviews.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No hay reportes. Sé el primero en avisar cómo está el aforo.</p>
                      ) : (
                        evReviews.map((rev, idx) => (
                          <div key={idx} className="bg-white p-1.5 rounded shadow-sm">
                            <span className="font-bold text-[10px] text-blue-600">@{rev.usuario}:</span>
                            <span className="text-[10px] text-slate-600 ml-1 leading-tight">{rev.comentario}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulario de envío */}
                    <form onSubmit={(e) => enviarReview(ev.id.toString(), e)} className="flex flex-col gap-1 mt-2 border-t border-slate-300 pt-2">
                      <input 
                        type="text" 
                        placeholder="Tu alias (ej. @BarnaLover)" 
                        className="text-[10px] p-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500" 
                        value={nuevoUsuario} 
                        onChange={e => setNuevoUsuario(e.target.value)} 
                        disabled={enviando}
                      />
                      <div className="flex gap-1">
                        <input 
                          type="text" 
                          placeholder="¿Mucha cola? ¿Vale la pena?" 
                          className="text-[10px] p-1.5 border border-slate-300 rounded flex-grow focus:outline-none focus:border-blue-500" 
                          value={nuevoComentario} 
                          onChange={e => setNuevoComentario(e.target.value)} 
                          disabled={enviando}
                        />
                        <button 
                          type="submit" 
                          disabled={enviando} 
                          className={`text-white p-1.5 rounded flex items-center justify-center transition-colors ${enviando ? 'bg-slate-400' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                        >
                          <Send size={12} />
                        </button>
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
