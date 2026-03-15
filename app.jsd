*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0f0f1a; --bg2: #1a1a2e; --surface: #16213e; --surface2: #1f2b47;
  --accent: #e94560; --text: #e8e8f0; --text2: #9a9ab0;
  --green: #00d084; --amber: #f59e0b; --blue: #3b82f6;
  --header-h: 56px; --filter-h: 48px; --radius: 16px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}
html, body { height: 100%; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); }
#app-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 500;
  height: var(--header-h); background: var(--bg2);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.logo { font-size: 18px; font-weight: 700; }
.badge { margin-left: 8px; padding: 2px 8px; background: var(--accent); color: #fff; border-radius: 999px; font-size: 11px; font-weight: 600; }
.header-right { display: flex; gap: 8px; }
.header-right button { background: var(--surface); border: none; color: var(--text); width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
#filter-bar {
  position: fixed; top: var(--header-h); left: 0; right: 0; z-index: 490;
  height: var(--filter-h); background: var(--bg2);
  display: flex; align-items: center; gap: 8px; padding: 0 12px;
  overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(255,255,255,0.06);
}
#filter-bar::-webkit-scrollbar { display: none; }
.filter-btn {
  flex-shrink: 0; background: var(--surface); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text2); padding: 6px 14px; border-radius: 999px;
  font-size: 12px; cursor: pointer; white-space: nowrap; transition: all 0.2s;
}
.filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
#map { position: fixed; top: calc(var(--header-h) + var(--filter-h)); left: 0; right: 0; bottom: 0; z-index: 1; }
.leaflet-container { background: #1a1a2e; }
.panel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 400;
  background: var(--bg2); border-radius: var(--radius) var(--radius) 0 0;
  max-height: 75vh; overflow-y: auto;
  transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
  box-shadow: var(--shadow);
}
.panel.open { transform: translateY(0); }
.panel.hidden { display: none; }
.panel-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 12px auto 8px; }
#panel-content { padding: 0 20px 32px; }
.event-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; line-height: 1.3; }
.event-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.tag { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.tag-free { background: rgba(0,208,132,0.15); color: var(--green); border: 1px solid rgba(0,208,132,0.3); }
.tag-family { background: rgba(59,130,246,0.15); color: var(--blue); border: 1px solid rgba(59,130,246,0.3); }
.tag-paid { background: rgba(245,158,11,0.15); color: var(--amber); border: 1px solid rgba(245,158,11,0.3); }
.tag-category { background: rgba(255,255,255,0.08); color: var(--text2); }
.event-desc { font-size: 14px; color: var(--text2); line-height: 1.6; margin: 12px 0; }
.event-location { font-size: 13px; color: var(--text2); margin-bottom: 16px; }
.event-location strong { color: var(--text); }
.panel-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.btn-primary { background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; flex: 1; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.85; }
.btn-secondary { background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 10px; font-size: 14px; cursor: pointer; flex: 1; transition: background 0.2s; }
.reviews-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
.reviews-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.review-item { margin-bottom: 16px; }
.review-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.review-stars { color: var(--amber); font-size: 13px; }
.review-time { font-size: 11px; color: var(--text2); }
.review-text { font-size: 13px; color: var(--text2); line-height: 1.5; }
.review-photo { width: 100%; max-width: 280px; border-radius: 8px; margin-top: 6px; }
.no-reviews { font-size: 13px; color: var(--text2); text-align: center; padding: 16px 0; }
#event-list {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 450;
  width: min(380px, 100vw); background: var(--bg2); overflow-y: auto;
  transform: translateX(100%); transition: transform 0.3s ease; box-shadow: var(--shadow);
}
#event-list.open { transform: translateX(0); }
#event-list.hidden { display: none; }
.list-header { position: sticky; top: 0; background: var(--bg2); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 600; }
.list-header button { background: none; border: none; color: var(--text); font-size: 18px; cursor: pointer; }
.list-item { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.15s; }
.list-item:hover { background: var(--surface); }
.list-item-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.list-item-sub { font-size: 12px; color: var(--text2); display: flex; gap: 8px; align-items: center; }
.dot-free { color: var(--green); }
.dot-family { color: var(--blue); }
.fab { position: fixed; bottom: 32px; right: 20px; z-index: 300; width: 52px; height: 52px; background: var(--accent); color: white; border: none; border-radius: 50%; font-size: 22px; cursor: pointer; box-shadow: var(--shadow); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
.fab:hover { transform: scale(1.08); }
#ar-overlay { position: fixed; inset: 0; z-index: 1000; background: #000; }
#ar-overlay.hidden { display: none; }
#ar-video { width: 100%; height: 100%; object-fit: cover; position: absolute; }
#ar-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#ar-hud { position: absolute; bottom: 80px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
#ar-compass { width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.5); background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 28px; }
#ar-info { background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; }
#ar-close { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.6); color: white; border: none; padding: 8px 16px; border-radius: 999px; font-size: 14px; cursor: pointer; }
.modal { position: fixed; inset: 0; z-index: 600; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; }
.modal.hidden { display: none; }
.modal-box { background: var(--bg2); border-radius: var(--radius) var(--radius) 0 0; padding: 24px 20px; width: 100%; max-width: 600px; }
.modal-box h3 { font-size: 17px; margin-bottom: 16px; }
#star-rating { display: flex; gap: 6px; margin-bottom: 14px; }
.star { font-size: 28px; color: var(--text2); cursor: pointer; transition: color 0.15s; }
.star.active { color: var(--amber); }
#review-text { width: 100%; height: 100px; padding: 12px; background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; font-size: 14px; resize: none; margin-bottom: 12px; }
.photo-label { display: block; text-align: center; padding: 10px; background: var(--surface); border-radius: 10px; cursor: pointer; font-size: 14px; color: var(--text2); margin-bottom: 12px; }
.photo-label input { display: none; }
#photo-preview img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
.modal-actions { display: flex; gap: 10px; }
.modal-actions button { flex: 1; padding: 12px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; }
#review-cancel { background: var(--surface); color: var(--text); }
#toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(30,30,50,0.95); color: var(--text); padding: 10px 20px; border-radius: 999px; font-size: 13px; z-index: 700; transition: opacity 0.3s; pointer-events: none; }
#toast.hidden { opacity: 0; }
#loading-overlay { position: fixed; inset: 0; z-index: 800; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
#loading-overlay.hidden { display: none; }
.pulse-loader { display: flex; gap: 8px; }
.pulse-loader div { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); animation: pulse-dot 1.2s ease-in-out infinite; }
.pulse-loader div:nth-child(2) { animation-delay: 0.2s; }
.pulse-loader div:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse-dot { 0%,100%{transform:scale(0.7);opacity:0.5} 50%{transform:scale(1.2);opacity:1} }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
@media (min-width: 768px) {
  .panel { max-width: 480px; left: auto; right: 20px; bottom: 20px; border-radius: var(--radius); }
}
