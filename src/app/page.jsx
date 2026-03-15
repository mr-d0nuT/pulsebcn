"use client";
import React from 'react';
import dynamic from 'next/dynamic';

const MapViewer = dynamic(() => import('../components/MapViewer'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-emerald-400 font-mono text-xl animate-pulse">Iniciando BarnaPulse Core...</div>
});

export default function App() {
  return <MapViewer />;
}
