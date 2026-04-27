import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Table, Order, MenuItem } from '../../types';
import { Users, Timer, TrendingUp, AlertCircle, CheckCircle2, Clock, UtensilsCrossed, ClipboardList, AlertTriangle, Package, QrCode, CreditCard, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '../../lib/utils';

export default function Dashboard() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTableData, setSelectedTableData] = useState<{table: Table, orders: Order[]} | null>(null);

  useEffect(() => {
    const qTables = query(collection(db, 'restaurants', 'default', 'tables'), orderBy('number', 'asc'));
    const unsubscribeTables = onSnapshot(qTables, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
    });

    const qOrders = query(collection(db, 'restaurants', 'default', 'orders'), where('status', '!=', 'paid'));
    const unsubscribeOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const qMenu = query(collection(db, 'restaurants', 'default', 'menus', 'main', 'items'));
    const unsubscribeMenu = onSnapshot(qMenu, (snap) => {
      setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    return () => {
      unsubscribeTables();
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, []);

  const openTableDetails = (table: Table) => {
    const tableOrders = orders.filter(o => o.tableId === table.id);
    setSelectedTableData({ table, orders: tableOrders });
  };

  const finalizeTable = async () => {
    if (!selectedTableData) return;
    try {
      const tableId = selectedTableData.table.id;
      const updatePromises = selectedTableData.orders
        .filter(o => o.status !== 'paid')
        .map(o => updateDoc(doc(db, 'restaurants', 'default', 'orders', o.id), { status: 'paid' }));
      
      await Promise.all(updatePromises);
      await updateDoc(doc(db, 'restaurants', 'default', 'tables', tableId), {
        status: 'free',
        callWaiter: false,
        requestBill: false
      });
      setSelectedTableData(null);
    } catch (err) {
      console.error(err);
    }
  };

  const lowStockItems = menuItems.filter(item => item.stock <= item.minStock);

  function LowStockAlerts() {
    return (
      <section className="bg-white border border-gray-200 rounded-[32px] p-6 flex flex-col min-h-[200px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Alertas de Estoque
          </h3>
          {lowStockItems.length > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{lowStockItems.length}</span>}
        </div>
        <div className="space-y-3">
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 opacity-50">
              <Package size={24} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Estoque OK</p>
            </div>
          ) : (
            lowStockItems.slice(0, 3).map(item => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-900">{item.name}</p>
                  <p className="text-[9px] text-red-600 font-black uppercase tracking-widest">Crítico: {item.stock} un</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                   <AlertCircle size={14} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  function ActiveAlerts() {
    const alertTables = tables.filter(t => t.callWaiter || t.requestBill);

    return (
      <section className="bg-white border border-gray-200 rounded-[32px] p-6 flex flex-col min-h-[150px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-500" />
            Atendimento Live
          </h3>
          {alertTables.length > 0 && <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">{alertTables.length}</span>}
        </div>
        <div className="space-y-3">
          {alertTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 opacity-50">
              <Users size={24} className="mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum chamado</p>
            </div>
          ) : (
            alertTables.map(table => (
              <div key={table.id} className={`p-3 rounded-2xl border flex justify-between items-center transition-all animate-in slide-in-from-right duration-500 ${
                table.requestBill ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
              }`}>
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Mesa {table.number}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${table.requestBill ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {table.requestBill ? 'Solicitou Conta' : 'Chamou Garçom'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${table.requestBill ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                   {table.requestBill ? <CreditCard size={14} /> : <UtensilsCrossed size={14} />}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  const chartData = [
    { time: '18:00', sales: 450 },
    { time: '19:00', sales: 1200 },
    { time: '20:00', sales: 2800 },
    { time: '21:00', sales: 2400 },
    { time: '22:00', sales: 1800 },
    { time: '23:00', sales: 900 },
  ];

  return (
    <div className="h-screen overflow-y-auto p-4 md:p-8 space-y-6 bg-gray-50 text-gray-900 pb-24">
      {/* Table Detail Modal Overlay */}
      <AnimatePresence>
        {selectedTableData && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <header className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-600 rounded-3xl flex items-center justify-center text-white font-black italic text-3xl shadow-xl shadow-orange-100">
                    {selectedTableData.table.number}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Comanda Aberta</h3>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Mesa {selectedTableData.table.number} • Digital Hub</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTableData(null)} className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm">
                  <X size={24} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {selectedTableData.orders.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-4">
                    <UtensilsCrossed size={48} className="opacity-20" />
                    <p className="font-black italic uppercase text-xs tracking-widest">Mesa Vazia</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTableData.orders.map(order => (
                      <div key={order.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                            order.status === 'ready' ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                          )}>
                            {order.status === 'ready' ? 'Pronto' : 'Em Preparo'}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">#{order.id.slice(-4)}</span>
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-sm font-bold italic">{item.qty}x {item.name}</span>
                              <span className="text-sm font-mono font-bold">R$ {((item.price || 0) * item.qty).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <footer className="p-8 border-t border-gray-100 bg-white flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Total Consolidado</span>
                    <span className="text-4xl font-mono font-black italic text-emerald-600 tracking-tighter">
                      R$ {selectedTableData.orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    onClick={finalizeTable}
                    disabled={selectedTableData.orders.length === 0}
                    className="px-10 py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:opacity-30"
                  >
                    Fechar e Liberar Mesa
                  </button>
                </div>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[40px] border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 italic">Monitoramento <span className="text-orange-600">Live</span></h2>
            <p className="text-xs text-gray-500 italic">GastroVoz AI • Unidade Principal</p>
          </div>
          <Link 
            to="/tables"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-orange-600 transition-all active:scale-95"
          >
            <QrCode size={14} /> Configurar Mesas
          </Link>
        </div>
        <div className="flex gap-6 w-full md:w-auto overflow-x-auto">
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Faturamento Hoje</span>
            <span className="text-xl font-mono text-emerald-600 font-bold">R$ 4.280,00</span>
          </div>
          <div className="w-px h-10 bg-gray-200 flex-shrink-0" />
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Status Cozinha</span>
            <span className="text-xl font-mono text-gray-900 font-bold">12m <span className="text-[10px] text-gray-400 uppercase font-sans">avg</span></span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-6 pb-8">
        {/* Table Map - Large Bento */}
        <section className="col-span-12 lg:col-span-8 bg-white border border-gray-200 rounded-[40px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Mapa de Mesas Ativas</h3>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-full border border-gray-200 uppercase font-bold">● Livre</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 text-[10px] rounded-full border border-orange-200 uppercase font-bold">● Ocupada</span>
              <span className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 text-[10px] rounded-full border border-red-200 uppercase font-bold">● Alerta</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {tables.map((table) => (
              <div key={table.id} onClick={() => openTableDetails(table)}>
                <TableCard table={table} />
              </div>
            ))}
          </div>
        </section>

        {/* Side Panels */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <ActiveAlerts />
          
          <section className="bg-white border border-gray-200 rounded-[32px] p-6 flex flex-col h-[300px] shadow-sm">
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">IA Voice Feed</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-mono italic">Processamento: 14ms</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="bg-gray-50 p-4 rounded-2xl border-l-4 border-orange-50 border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Mesa {tables.find(t => t.id === order.tableId)?.number} • {order.type === 'waiter' ? 'Garçom' : 'QR'}</p>
                    <span className="text-[9px] bg-gray-200 px-2 py-0.5 rounded text-gray-500 uppercase font-bold">Live</span>
                  </div>
                  <p className="text-xs text-gray-700 italic mb-3 leading-relaxed">
                    "{order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}..."
                  </p>
                </div>
              ))}
            </div>
          </section>

          <LowStockAlerts />

          <section className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-[32px] p-8 text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
              <TrendingUp size={120} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4 flex items-center gap-2">
               <TrendingUp size={12} /> Insights Premium gastrovoz 
            </h3>
            <div className="flex items-end justify-between relative z-10">
              <div>
                <p className="text-5xl font-black italic tracking-tighter">+24%</p>
                <p className="text-xs font-medium opacity-80 mt-1">Ticket Médio via IA</p>
              </div>
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-[32px] p-6 space-y-4 shadow-xl">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Próximos Passos SAAS</h3>
             <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                   <p className="text-[10px] font-bold text-white group-hover:text-orange-400">Plano de Salão Customizado</p>
                   <p className="text-[9px] text-gray-500">Arraste e solte mesas no mapa.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                   <p className="text-[10px] font-bold text-white group-hover:text-orange-400">Previsão de Demanda IA</p>
                   <p className="text-[9px] text-gray-500">Saiba quanto vai vender amanhã.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                   <p className="text-[10px] font-bold text-white group-hover:text-orange-400">Gestão de Garçons</p>
                   <p className="text-[9px] text-gray-500">Ranking de produtividade por voz.</p>
                </div>
             </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-[32px] p-6 h-[250px] shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Fluxo de Pedidos</h3>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                    itemStyle={{ color: '#111', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </main>

      <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] px-4 py-8 gap-4">
        <div>Sistema Operacional GastroVoz v1.2</div>
        <div className="flex gap-8">
          <span>Sincronização OK</span>
          <span>Buffer: 0pk/s</span>
          <span className="text-gray-300">© 2026</span>
        </div>
      </footer>
    </div>
  );
}

function TableCard({ table }: { table: Table }) {
  const getStatusColor = () => {
    if (table.requestBill) return 'bg-emerald-50 border-emerald-500 text-emerald-600';
    if (table.callWaiter) return 'bg-red-50 border-red-500 text-red-600 animate-pulse';
    if (table.status === 'busy') return 'bg-orange-50 border-orange-500 text-orange-600';
    return 'bg-white border-gray-100 text-gray-200';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative h-40 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden p-4 group",
        getStatusColor()
      )}
    >
      {/* Table Visual Representation */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Top-down view of a table */}
        <div className={cn(
          "absolute w-12 h-12 rounded-full border-2 transition-colors",
          table.status === 'free' ? 'border-gray-100 bg-gray-50' : 'border-current bg-current/10'
        )} />
        {/* Chairs around the table */}
        {[0, 90, 180, 270].map((deg) => (
          <div 
            key={deg}
            style={{ transform: `rotate(${deg}deg) translateY(-28px)` }}
            className={cn(
              "absolute w-4 h-2 rounded-t-lg border-x-2 border-t-2 transition-colors",
              table.status === 'free' ? 'border-gray-100' : 'border-current'
            )}
          />
        ))}
        <span className={cn(
          "text-2xl font-black italic relative z-10 transition-colors",
          table.status === 'free' ? 'text-gray-300' : 'text-current'
        )}>
          {table.number}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
          {table.requestBill ? 'Conta Solicitada' : table.callWaiter ? 'Garçom!' : table.status === 'busy' ? 'Ocupada' : 'Livre'}
        </span>
        
        {table.status === 'busy' && (
          <div className="flex items-center gap-1.5 opacity-40">
             <div className="w-1 h-3 bg-current rounded-full" />
             <div className="w-1 h-3 bg-current rounded-full" />
             <div className="w-1 h-3 bg-current rounded-full" />
          </div>
        )}
      </div>

      {/* Floating Status Badges */}
      {(table.requestBill || table.callWaiter) && (
        <div className="absolute top-3 right-3 scale-75 sm:scale-100">
          <div className="w-6 h-6 rounded-full bg-current flex items-center justify-center text-white shadow-lg">
            {table.requestBill ? <CreditCard size={10} /> : <AlertCircle size={10} />}
          </div>
        </div>
      )}
    </motion.div>
  );
}

