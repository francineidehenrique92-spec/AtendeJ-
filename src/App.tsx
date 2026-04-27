import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Package, ChefHat, Utensils, QrCode, ClipboardList, LogOut } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import Dashboard from './components/Manager/Dashboard';
import InventoryManager from './components/Manager/Inventory';
import TableManager from './components/Manager/Tables';
import KDS from './components/Manager/KDS';
import VoiceTerminal from './components/Waiter/VoiceTerminal';
import CustomerMenu from './components/Customer/Menu';
import { initializeMockData } from './mockData';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000); // Fail-safe: force hide loading after 5s

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          try {
            await signInAnonymously(auth);
          } catch (err: any) {
            if (err.code === 'auth/admin-restricted-operation') {
              console.warn("Anonymous auth disabled. Running in unauthenticated mode for now.");
              // For development/preview, we can continue without a real user if rules allow
            } else {
              throw err;
            }
          }
        } else {
          setUser(user);
          await initializeMockData().catch(console.error);
        }
      } catch (err) {
        console.error("Auth/Init Error:", err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-medium text-neutral-600">GastroVoz AI</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
        <Nav />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tables" element={<TableManager />} />
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/kds" element={<KDS />} />
            <Route path="/waiter" element={<VoiceTerminal />} />
            <Route path="/customer" element={<CustomerMenu tableId="table-1" />} />
            <Route path="/customer/:tableId" element={<CustomerMenuWrapper />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Nav() {
  const location = useLocation();
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutGrid },
    { name: 'Mesas QR', path: '/tables', icon: QrCode },
    { name: 'KDS Cozinha', path: '/kds', icon: ChefHat },
    { name: 'Inventário', path: '/inventory', icon: Package },
    { name: 'Garçom Voz', path: '/waiter', icon: ClipboardList },
    { name: 'Menu Demo', path: '/customer', icon: Utensils },
  ];

  return (
    <nav className="md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-6 gap-2">
      <div className="flex items-center gap-3 py-6">
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xl tracking-tighter">
          AI
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">GastroVoz <span className="text-orange-500">v1.0</span></h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Intelligent SaaS</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-1.5 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium border ${
              location.pathname === item.path
                ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                : 'border-transparent text-slate-400 hover:bg-slate-800'
            }`}
          >
            <item.icon size={20} />
            {item.name}
          </Link>
        ))}
      </div>

      <div className="pt-6 border-t border-slate-800 flex flex-col gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Status Sistema</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-300">Sincronizado OK</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
          <span>Terminal #02</span>
          <button onClick={() => auth.signOut()} className="hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function CustomerMenuWrapper() {
  // Extract tableId from URL
  const location = useLocation();
  const tableId = location.pathname.split('/').pop() || 'table-1';
  return <CustomerMenu tableId={tableId} />;
}
