import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, Table } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, ChefHat, Timer } from 'lucide-react';

export default function KDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    const qOrders = query(collection(db, 'restaurants', 'default', 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const qTables = query(collection(db, 'restaurants', 'default', 'tables'));
    const unsubscribeTables = onSnapshot(qTables, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTables();
    };
  }, []);

  const completeOrder = async (orderId: string) => {
    await updateDoc(doc(db, 'restaurants', 'default', 'orders', orderId), {
      status: 'ready'
    });
  };

  const getTableNumber = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.number || '?';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      <header className="p-8 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
            <ChefHat size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">Cozinha <span className="text-emerald-600">Live</span></h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Monitoramento de Produção em Tempo Real</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fila de Produção</span>
             <span className="text-2xl font-mono text-gray-900 font-bold">{orders.filter(o => o.status === 'preparing').length} <span className="text-xs text-gray-400 font-sans">pedidos</span></span>
          </div>
          <div className="w-px h-12 bg-gray-100" />
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tempo Médio</span>
             <span className="text-2xl font-mono text-orange-600 font-bold">14m</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {orders.filter(o => o.status === 'preparing').map((order, idx) => (
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              key={order.id}
              className="bg-white border border-gray-200 rounded-[40px] flex flex-col shadow-sm relative overflow-hidden group h-fit"
            >
              {/* Urgency Indicator */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-600" />
              
              <div className="p-8 pb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-4xl font-black italic text-gray-900 mb-1">Mesa {getTableNumber(order.tableId)}</h3>
                  <div className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                    <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 text-center">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">Ticket</p>
                  <p className="text-xs font-mono text-gray-900 font-bold">#{order.id.slice(-4)}</p>
                </div>
              </div>

              <div className="p-8 pt-4 flex-1 space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col gap-2 group-hover:border-gray-200 transition-colors">
                    <div className="flex justify-between items-center text-gray-900">
                      <span className="text-xl font-black italic tracking-tight">{item.qty}x {item.name}</span>
                    </div>
                    {item.ponto && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[9px] rounded-full font-black uppercase w-fit border border-orange-200">
                        {item.ponto}
                      </span>
                    )}
                    {item.obs && item.obs.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.obs.map((ob, k) => (
                          <span key={k} className="px-3 py-1 bg-gray-200 text-gray-600 text-[9px] rounded-full font-black uppercase">
                            {ob}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-8 pt-0">
                <button
                  onClick={() => completeOrder(order.id)}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <CheckCircle2 size={20} />
                  Pedido Pronto
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      <footer className="p-6 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-widest bg-white">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-600" /> Prioridade Normal</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> Urgente ({'>'}20m)</span>
        </div>
        <div className="font-mono text-gray-400">KDS TERMINAL #01 • STATUS: OPERACIONAL</div>
      </footer>
    </div>
  );
}
