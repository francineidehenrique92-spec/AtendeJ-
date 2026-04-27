import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, where, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Table, Order } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Plus, Trash2, ExternalLink, Download, Eye, EyeOff, Receipt, X, Clock } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function TableManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [revealedQr, setRevealedQr] = useState<string[]>([]);
  const [selectedTableOrders, setSelectedTableOrders] = useState<{table: Table, orders: Order[]} | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'restaurants', 'default', 'tables'));
    return onSnapshot(q, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)).sort((a, b) => a.number - b.number));
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

  const toggleQr = (id: string) => {
    setRevealedQr(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openComanda = (table: Table) => {
    const q = query(
      collection(db, 'restaurants', 'default', 'orders'),
      where('tableId', '==', table.id),
      orderBy('createdAt', 'desc')
    );
    
    // One-time fetch or snapshot? Let's use snapshot for real-time comanda
    const unsubscribe = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setSelectedTableOrders({ table, orders });
    });

    // We'll handle unsubscribe when modal closes or manually
    (window as any)._comandaUnsubscribe = unsubscribe;
  };

  const [splitCount, setSplitCount] = useState(1);

  const closeComanda = () => {
    if ((window as any)._comandaUnsubscribe) {
      (window as any)._comandaUnsubscribe();
    }
    setSelectedTableOrders(null);
    setSplitCount(1);
  };

  const finalizeTable = async () => {
    if (!selectedTableOrders) return;
    try {
      const tableId = selectedTableOrders.table.id;
      
      // Mark all current orders as paid
      const updatePromises = selectedTableOrders.orders
        .filter(o => o.status !== 'paid')
        .map(o => updateDoc(doc(db, 'restaurants', 'default', 'orders', o.id), { status: 'paid' }));
      
      await Promise.all(updatePromises);

      await updateDoc(doc(db, 'restaurants', 'default', 'tables', tableId), {
        status: 'free',
        callWaiter: false,
        requestBill: false,
        updatedAt: serverTimestamp()
      });
      closeComanda();
      alert('Mesa finalizada e liberada com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const downloadQr = (id: string, number: number) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `mesa-${number}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const getTableUrl = (id: string) => {
    return `${window.location.origin}/customer/${id}`;
  };

  return (
    <div className="h-screen overflow-y-auto p-8 space-y-8 bg-gray-50 text-gray-900">
      <header className="flex justify-between items-center mb-8 bg-white p-8 rounded-[40px] border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-gray-900">Configurador de <span className="text-orange-600">Mesas</span></h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-black">Escaneie, Baixe ou Monitore pedidos</p>
        </div>
        <form onSubmit={addTable} className="flex gap-3 bg-gray-100 p-2 rounded-2xl border border-gray-200">
          <input 
            type="number" 
            placeholder="Nº Mesa"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-gray-900 w-24 px-4 font-bold"
          />
          <button className="bg-orange-600 hover:bg-orange-500 p-3 rounded-xl transition-colors text-white">
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
              className="bg-white border border-gray-200 rounded-[40px] p-8 flex flex-col items-center gap-6 group hover:border-orange-500/50 transition-all shadow-sm relative overflow-hidden"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-5xl font-black italic text-gray-900 uppercase tracking-tighter">Mesa {table.number}</h3>
                  {table.status !== 'free' && (
                    <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Digital Hub #{table.id.slice(-4)}</span>
              </div>

              <div className="relative w-full aspect-square flex items-center justify-center bg-gray-50 rounded-[32px] border border-gray-200 overflow-hidden">
                {revealedQr.includes(table.id) ? (
                  <div className="bg-white p-6 rounded-3xl animate-in zoom-in-95 duration-300">
                    <QRCodeCanvas 
                      id={`qr-${table.id}`}
                      value={getTableUrl(table.id)} 
                      size={180} 
                      level="H" 
                      includeMargin={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-gray-300">
                    <QrCode size={80} strokeWidth={1} />
                    <button 
                      onClick={() => toggleQr(table.id)}
                      className="text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-orange-500 transition-colors"
                    >
                      Revelar Código
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full grid grid-cols-2 gap-3">
                <button 
                  onClick={() => openComanda(table)}
                  className="bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-orange-900/10"
                >
                  <Receipt size={16} /> Comanda
                </button>
                <div className="flex gap-2">
                   <button 
                     onClick={() => downloadQr(table.id, table.number)}
                     disabled={!revealedQr.includes(table.id)}
                     className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 py-4 rounded-2xl flex items-center justify-center text-gray-600 transition-all"
                   >
                     <Download size={18} />
                   </button>
                   <button 
                     onClick={() => removeTable(table.id)}
                     className="w-12 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-500 py-4 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>

              <button 
                onClick={() => window.open(getTableUrl(table.id), '_blank')}
                className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-[9px] uppercase font-black tracking-widest text-gray-500 hover:text-gray-900 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink size={12} /> Visualizar como Cliente
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Comanda Modal */}
      <AnimatePresence>
        {selectedTableOrders && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-white border border-gray-200 w-full max-w-2xl rounded-[40px] flex flex-col max-h-[80vh] shadow-2xl overflow-hidden"
            >
              <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                    <Receipt size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic text-gray-900 uppercase tracking-tighter">Comanda Digital • Mesa {selectedTableOrders.table.number}</h3>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{selectedTableOrders.orders.length} pedidos realizados</p>
                  </div>
                </div>
                <button 
                  onClick={closeComanda}
                  className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {selectedTableOrders.orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                    <Receipt size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold italic tracking-tight">Nenhum pedido ativo para esta mesa</p>
                  </div>
                ) : (
                  selectedTableOrders.orders.map((order) => (
                    <div key={order.id} className="bg-gray-50 p-6 rounded-[32px] border border-gray-200 space-y-4">
                      <div className="flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Clock size={12} /> {new Date(order.createdAt).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full border ${
                          order.status === 'ready' ? 'border-emerald-500/30 text-emerald-600 bg-emerald-50' : 'border-orange-500/30 text-orange-600 bg-orange-50'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center group">
                            <span className="text-sm font-bold text-gray-700">{item.qty}x <span className="italic">{item.name}</span></span>
                            <span className="text-xs font-mono text-gray-400">R$ {(item.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400" mt-1>Total Ticket</span>
                        <span className="text-xl font-mono font-bold text-gray-900 tracking-tighter">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <footer className="p-8 border-t border-gray-100 bg-gray-50 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Consumo Total + 10%</span>
                    <span className="text-3xl font-mono font-black italic text-emerald-600 tracking-tighter">
                      R$ {(selectedTableOrders.orders.reduce((acc, o) => acc + o.total, 0) * 1.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Dividir p/ pessoas</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600">-</button>
                      <span className="text-xl font-black italic">{splitCount}</span>
                      <button onClick={() => setSplitCount(splitCount + 1)} className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600">+</button>
                    </div>
                  </div>
                </div>

                {splitCount > 1 && (
                  <div className="p-4 bg-orange-600 rounded-2xl flex justify-between items-center animate-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Individual</span>
                    <span className="text-2xl font-mono font-black italic text-white italic">
                      R$ {((selectedTableOrders.orders.reduce((acc, o) => acc + o.total, 0) * 1.1) / splitCount).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={finalizeTable}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-gray-200"
                  >
                    Fechar Conta Integral
                  </button>
                  <button 
                    className="px-6 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-colors"
                  >
                    Pagamento Parcial
                  </button>
                </div>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

