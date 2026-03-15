"use client";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Star, Send } from 'lucide-react';

// === PEGA TU URL DE GOOGLE APPS SCRIPT AQUÍ ===
const GOOGLE_SHEETS_API_URL = "PEGAR_TU_URL_AQUI";
// ==============================================

export default function MapViewer() {
  const [eventos, setEventos] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  // Estados para el formulario de reviews
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // 1. Obtener Eventos de Barcelona
    const fetchBarnaData = async () => {
      try {
        const res = await fetch('https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=e7041793-6c8c-4f10-9080-33b09228a0f9&limit=100');
        const data = await res.json();
        const records = data.result.records.filter(r => r.lat && r.lon).map(r => ({
            id: r._id,
            name: r.name,
            pos: [parseFloat(r.lat), parseFloat(r.lon)],
            info: r.description || "Sin descripción",
            horari: r.prox_ses_horari || "Ver detalle"
        }));
        setEventos(records);
      } catch (e) { console.error("Error Open Data", e); }
    };

    // 2. Obtener Reviews de tu Google Sheet
    const fetchReviews = async () => {
      if(GOOGLE_SHEETS_API_URL === "PEGAR_TU_URL_AQUI") return;
      try {
        const res = await fetch(GOOGLE_SHEETS_API_URL);
        const data = await res.json();
        setReviews(data);
      } catch (e) { console.error("Error cargando reviews", e); }
    };

    fetchBarnaData();
    fetchReviews();
  }, []);

  const enviarReview = async (evento_id, e) => {
    e.preventDefault();
    if(!nuevoUsuario || !nuevoComentario) return alert("Rellena nombre y comentario");
    setEnviando(true);
    
    try {
      await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          evento_id: evento_id,
          usuario: nuevoUsuario,
          estrellas: 5,
          comentario: nuevoComentario
        })
      });
      // Actualizar vista local
      setReviews([...reviews, { evento_id, usuario: nuevoUsuario, estrellas: 5, comentario: nuevoComentario }]);
      setNuevoComentario("");
      setNuevoUsuario("");
    } catch (error) {
      console.error(error);
      alert("Error al enviar la review");
    }
    setEnviando(false);
  };

  const eventIcon = L.divIcon({ html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(37,99,235,0.8);"></div>`, className: 'event-marker' });

  return (
    <div className="h-screen w-screen absolute inset-0 bg-slate-900">
      <MapContainer center={[41.387, 2.170]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        {eventos.map(ev => {
          // Filtrar reviews de este evento específico
          const evReviews = reviews.filter(r => r.evento_id === ev.id.toString());
          
          return (
            <Marker key={ev.id} position={ev.pos} icon={eventIcon}>
              <Popup className="w-72">
                <div className="font-sans text-slate-800">
                  <h3 className="font-black text-sm mb-1 text-blue-900">{ev.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mb-2">🕒 {ev.horari}</p>
                  
                  {/* Zona de Reviews */}
                  <div className="bg-slate-100 p-2 rounded-lg mt-3">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2 border-b border-slate-300 pb-1 flex items-center gap-1">
                      <Star size={10} className="text-yellow-500" /> Comunidad ({evReviews.length})
                    </h4>
                    
                    <div className="max-h-24 overflow-y-auto space-y-2 mb-2">
                      {evReviews.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Sé el primero en reportar sobre este evento.</p>
                      ) : (
                        evReviews.map((rev, idx) => (
                          <div key={idx} className="bg-white p-1.5 rounded shadow-sm">
                            <span className="font-bold text-[10px] text-blue-600">@{rev.usuario}:</span>
                            <span className="text-[10px] text-slate-600 ml-1">{rev.comentario}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulario de envío a Google Sheets */}
                    <form onSubmit={(e) => enviarReview(ev.id.toString(), e)} className="flex flex-col gap-1 mt-2 border-t border-slate-300 pt-2">
                      <input type="text" placeholder="Tu alias..." className="text-[10px] p-1 border rounded" value={nuevoUsuario} onChange={e => setNuevoUsuario(e.target.value)} disabled={enviando}/>
                      <div className="flex gap-1">
                        <input type="text" placeholder="¿Cómo está el aforo/ambiente?" className="text-[10px] p-1 border rounded flex-grow" value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} disabled={enviando}/>
                        <button type="submit" disabled={enviando} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded flex items-center justify-center">
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
