import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MenuItem } from '../../types';
import { motion } from 'motion/react';
import { Package, AlertTriangle, TrendingUp, Upload, FileText, Loader2 } from 'lucide-react';
import { processInvoiceWithAI } from '../../services/inventoryService';

export default function InventoryManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoiceText, setInvoiceText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'restaurants', 'default', 'menus', 'main', 'items'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
      setLoading(false);
    });
  }, []);

  const handleInvoiceUpload = async () => {
    if (!invoiceText) return;
    setProcessing(true);
    try {
      await processInvoiceWithAI(invoiceText);
      setInvoiceText('');
      alert("Nota processada! Cardápio e estoque atualizados com margem de lucro aplicada.");
    } catch (err) {
      alert("Erro ao processar nota.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto p-8 space-y-8 bg-slate-950 text-slate-200">
      <header className="flex justify-between items-center mb-8 bg-slate-900/50 p-8 rounded-[40px] border border-slate-800">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-white">Gestão Hub <span className="text-orange-500">Logística</span></h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Escaneamento de Notas & Controle de Estoque</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-600 block uppercase font-black">Meta de Lucro</span>
            <span className="text-xl font-mono text-emerald-500 font-bold">150%</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Invoice Scanner */}
        <section className="col-span-12 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <FileText size={120} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
            <Upload size={14} className="text-orange-500" />
            Scanner de Compras
          </h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Cole os dados da Nota Fiscal (XML ou Texto) abaixo. A IA irá identificar os produtos e atualizar o estoque e preços automaticamente.
          </p>
          <div className="space-y-4">
            <textarea 
              value={invoiceText}
              onChange={(e) => setInvoiceText(e.target.value)}
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-sm font-mono text-slate-300 focus:border-orange-500 transition-colors resize-none mb-4"
              placeholder="Cole o conteúdo da NF-e aqui..."
            />
            <button 
              onClick={handleInvoiceUpload}
              disabled={processing || !invoiceText}
              className="w-full py-5 bg-orange-600 hover:bg-orange-500 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" /> : <TrendingUp size={18} />}
              Processar & Aplicar Margem
            </button>
          </div>
        </section>

        {/* Stock List */}
        <section className="col-span-12 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
            <Package size={14} className="text-orange-500" />
            Inventory Live Feed
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-black tracking-widest text-slate-600 border-b border-slate-800">
                  <th className="pb-4 px-4 font-black">Produto</th>
                  <th className="pb-4 px-4 font-black">Estoque</th>
                  <th className="pb-4 px-4 font-black">Status</th>
                  <th className="pb-4 px-4 font-black">Custo</th>
                  <th className="pb-4 px-4 font-black">Venda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {items.map(item => {
                  const isLow = item.stock <= item.minStock;
                  return (
                    <motion.tr key={item.id} className="group hover:bg-slate-800/20 transition-colors">
                      <td className="py-5 px-4">
                        <p className="font-bold text-white italic">{item.name}</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tighter">{item.category}</p>
                      </td>
                      <td className="py-5 px-4 font-mono text-lg font-bold">
                        {item.stock}
                      </td>
                      <td className="py-5 px-4">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20 uppercase animate-pulse">
                            <AlertTriangle size={10} /> Crítico
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 uppercase">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-4 font-mono text-sm text-slate-500">
                        R$ {item.costPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-5 px-4 font-mono text-sm text-orange-500 font-bold">
                        R$ {item.price.toFixed(2)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
