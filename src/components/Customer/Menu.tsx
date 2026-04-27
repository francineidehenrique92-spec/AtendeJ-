import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MenuItem, Order, Table } from '../../types';
import { ShoppingBag, Plus, Minus, Check, CreditCard, Star, Search, Clock, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function CustomerMenu({ tableId }: { tableId: string }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Carnes');
  const [loading, setLoading] = useState(true);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [sharedOrder, setSharedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Load Menu
    const qMenu = collection(db, 'restaurants', 'default', 'menus', 'main', 'items');
    const unsubscribeMenu = onSnapshot(qMenu, (snap) => {
      setMenuItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    // Load Table Status
    const unsubscribeTable = onSnapshot(doc(db, 'restaurants', 'default', 'tables', tableId), (snap) => {
      setTable({ id: snap.id, ...snap.data() } as Table);
    });

    // Load Live Shared Order for this table (if any)
    const qOrders = query(
      collection(db, 'restaurants', 'default', 'orders'),
      where('tableId', '==', tableId),
      where('status', 'in', ['pending', 'preparing', 'delivered'])
    );
    const unsubscribeOrders = onSnapshot(qOrders, (snap) => {
      if (!snap.empty) {
        setSharedOrder({ id: snap.docs[0].id, ...snap.docs[0].data() } as Order);
      } else {
        setSharedOrder(null);
      }
    });

    setLoading(false);
    return () => {
      unsubscribeMenu();
      unsubscribeTable();
      unsubscribeOrders();
    };
  }, [tableId]);

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing?.qty === 1) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      const orderData = {
        tableId,
        status: 'pending',
        type: 'customer',
        items: cart.map(item => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          status: 'pending'
        })),
        total: cartTotal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'restaurants', 'default', 'orders'), orderData);
      await updateDoc(doc(db, 'restaurants', 'default', 'tables', tableId), {
        status: 'busy',
        updatedAt: serverTimestamp()
      });

      setCart([]);
      setCheckoutVisible(false);
      alert('Pedido realizado com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <div className="h-screen bg-slate-950 overflow-hidden flex flex-col relative max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10 shadow-lg">
        <div>
          <h2 className="text-xl font-black italic tracking-tighter text-white">Mesa {table?.number || '?'}</h2>
          <p className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] flex items-center gap-1 mt-0.5">
            <Check size={10} /> Live Sync Active
          </p>
        </div>
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-700 active:bg-orange-600 active:text-white transition-all cursor-pointer" onClick={() => alert('Garçom chamado para a Mesa ' + table?.number)}>
          <Utensils size={24} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 pb-32 scrollbar-hide">
        {/* Shared Order Alert */}
        {sharedOrder && (
          <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-[28px] flex items-center gap-4 shadow-inner">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
              <ShoppingBag size={24} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Seu Pedido Ativo</p>
              <p className="text-sm font-bold text-white tracking-tight">
                {sharedOrder.items.length} itens em preparo...
              </p>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border",
                activeTab === cat 
                  ? "bg-white text-slate-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                  : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-8">
          <h3 className="font-black italic text-2xl text-white tracking-tight">{activeTab}</h3>
          <div className="grid gap-8">
            {menuItems.filter(i => i.category === activeTab).map((item) => (
              <div key={item.id} className="flex gap-5 group">
                <div className="w-28 h-28 bg-slate-900 rounded-[32px] border border-slate-800 flex-shrink-0 flex items-center justify-center text-slate-700 shadow-inner overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                  <Utensils size={32} />
                </div>
                <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-white leading-tight">{item.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-black text-orange-500 italic text-xl">R$ {item.price.toFixed(2)}</span>
                    <button 
                      onClick={() => addToCart(item)}
                      className="bg-white text-slate-950 w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Upsell */}
        <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-[40px] text-white space-y-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-start relative z-10">
            <h4 className="font-black text-2xl italic leading-[1.1] tracking-tighter">Sobremesa <br/>Grátis?</h4>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Star className="text-white fill-white" size={20} />
            </div>
          </div>
          <p className="text-sm font-medium text-orange-50 relative z-10 leading-relaxed px-1">
            Adicione um café e uma sobremesa e o café é por nossa conta.
          </p>
          <button className="w-full py-4 bg-white text-orange-700 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-orange-50 transition-all relative z-10">
            Aproveitar Agora
          </button>
        </div>

        {/* Feedback Section */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] text-center space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">O que achou do atendimento?</h4>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="text-slate-700 hover:text-orange-500 transition-colors">
                <Star size={24} fill={star <= 4 ? "currentColor" : "none"} className={star <= 4 ? "text-orange-500" : ""} />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 italic">Sua opinião ajuda a melhorar nossa IA</p>
        </div>
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            exit={{ y: 150 }}
            className="absolute bottom-8 left-6 right-6 z-20"
          >
            <button 
              onClick={() => setCheckoutVisible(true)}
              className="w-full bg-white text-slate-950 p-6 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center group overflow-hidden border-4 border-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center font-black text-white text-lg">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </div>
                <span className="font-black text-sm uppercase tracking-[0.2em] italic">Finalizar</span>
              </div>
              <span className="text-2xl font-black italic tracking-tighter text-orange-600">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Sidebar/Modal */}
      <AnimatePresence>
        {checkoutVisible && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutVisible(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-[50px] z-40 p-10 pt-10 border-t border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide text-white"
            >
              <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-10" />
              
              <div className="space-y-10">
                <h3 className="text-3xl font-black italic tracking-tighter text-white">Sua Comanda</h3>
                
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center group">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-white group-hover:text-orange-500 transition-colors">{item.name}</p>
                        <p className="text-xs text-slate-500 font-medium">R$ {item.price.toFixed(2)} un.</p>
                      </div>
                      <div className="flex items-center gap-5 bg-slate-950 px-5 py-2.5 rounded-[20px] border border-slate-800 shadow-inner">
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-600 hover:text-red-500 transition-colors"><Minus size={18} /></button>
                        <span className="font-black text-lg w-6 text-center">{item.qty}</span>
                        <button onClick={() => addToCart(item)} className="text-slate-600 hover:text-emerald-500 transition-colors"><Plus size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-10 border-t border-slate-800 space-y-4">
                  <div className="flex justify-between text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <span>Consumo Bruto</span>
                    <span className="font-mono">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <span>Serviço (10%)</span>
                    <span className="font-mono">R$ {(cartTotal * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-6">
                    <span className="font-black italic text-2xl text-white tracking-tighter">Subtotal</span>
                    <span className="text-4xl font-black italic text-orange-600 tracking-tighter">R$ {(cartTotal * 1.1).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  className="w-full bg-orange-600 text-white py-6 rounded-[32px] font-black text-lg shadow-2xl shadow-orange-900/40 hover:bg-orange-500 transition-all flex items-center justify-center gap-4 active:scale-95 uppercase tracking-widest"
                >
                  <CreditCard size={24} />
                  Enviar Pedido
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
