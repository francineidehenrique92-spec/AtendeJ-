import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Table } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Plus, Trash2, ExternalLink, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TableManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'restaurants', 'default', 'tables'));
    return onSnapshot(q, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)).sort((a, b) => a.number - b.number));
      setLoading(false);
    });
  }, []);

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;
    
    await addDoc(collection(db, 'restaurants', 'default', 'tables'), {
      number: parseInt(newTableNumber),
      status: 'free',
      updatedAt: serverTimestamp()
    });
    setNewTableNumber('');
  };

  const removeTable = async (id: string) => {
    if (confirm('Deseja excluir esta mesa?')) {
      await deleteDoc(doc(db, 'restaurants', 'default', 'tables', id));
    }
  };

  const getTableUrl = (id: string) => {
    return `${window.location.origin}/customer/${id}`;
  };

  return (
    <div className="h-screen overflow-y-auto p-8 space-y-8 bg-slate-950 text-slate-200">
      <header className="flex justify-between items-center mb-8 bg-slate-900/50 p-8 rounded-[40px] border border-slate-800">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-white">Configurador de <span className="text-orange-500">Mesas</span></h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Adicione mesas e gere QR Codes únicos</p>
        </div>
        <form onSubmit={addTable} className="flex gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
          <input 
            type="number" 
            placeholder="Nº Mesa"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-white w-24 px-4 font-bold"
          />
          <button className="bg-orange-600 hover:bg-orange-500 p-3 rounded-xl transition-colors">
            <Plus size={20} />
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence>
          {tables.map((table) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={table.id}
              className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 flex flex-col items-center gap-6 group hover:border-orange-500/50 transition-all shadow-2xl"
            >
              <div className="text-center">
                <h3 className="text-5xl font-black italic text-white mb-2">Mesa {table.number}</h3>
                <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">ID: {table.id.slice(-6)}</span>
              </div>

              <div className="bg-white p-4 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <QRCodeSVG value={getTableUrl(table.id)} size={160} level="H" />
              </div>

              <div className="w-full flex gap-3">
                <button 
                  onClick={() => window.open(getTableUrl(table.id), '_blank')}
                  className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all"
                >
                  <ExternalLink size={14} /> Abrir
                </button>
                <button 
                  onClick={() => removeTable(table.id)}
                  className="w-12 bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/50 py-3 rounded-2xl flex items-center justify-center text-slate-600 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <p className="text-[9px] text-slate-700 italic text-center px-4 leading-relaxed">
                Escaneie o código acima para acessar o cardápio digital desta mesa.
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
