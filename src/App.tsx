import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { LayoutGrid, Package, ChefHat, Utensils, QrCode, ClipboardList, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import Dashboard from './components/Manager/Dashboard';
import InventoryManager from './components/Manager/Inventory';
import TableManager from './components/Manager/Tables';
import KDS from './components/Manager/KDS';
import VoiceTerminal from './components/Waiter/VoiceTerminal';
import CustomerMenu from './components/Customer/Menu';
import { initializeMockData } from './mockData';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await signInAnonymously(auth).catch(err => {
            if (err.code !== 'auth/admin-restricted-operation') throw err;
          });
        } else {
          setUser(user);
          await initializeMockData().catch(console.error);
        }
      } catch (err) {
        console.error("Auth/Init Error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
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
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
        <Nav collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
        <main className="flex-1 overflow-hidden transition-all duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tables" element={<TableManager />} />
            <Route path="/inventory" element={<InventoryManager />} />
            <Route path="/kds" element={<KDS />} />
            <Route path="/waiter" element={<VoiceTerminal />} />
            <Route path="/customer/:tableId" element={<CustomerMenuWrapper />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Nav({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const location = useLocation();
  if (location.pathname.startsWith('/customer')) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutGrid },
    { name: 'Mesas QR', path: '/tables', icon: QrCode },
    { name: 'KDS Cozinha', path: '/kds', icon: ChefHat },
    { name: 'Inventário', path: '/inventory', icon: Package },
    { name: 'Garçom Voz', path: '/waiter', icon: ClipboardList },
  ];

  return (
    <nav className={cn(
      "bg-white border-r border-gray-100 flex flex-col p-6 gap-2 shadow-sm relative z-10 transition-all duration-300",
      collapsed ? "md:w-20 px-4" : "md:w-64"
    )}>
      <div className={cn("flex items-center gap-3 py-6 overflow-hidden", collapsed ? "justify-center" : "")}>
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-xl tracking-tighter">AI</div>
        {!collapsed && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">GastroVoz <span className="text-orange-600">v1.2</span></h1>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Intelligent System</p>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-1.5 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium border",
              location.pathname === item.path
                ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-100'
                : 'border-transparent text-gray-500 hover:bg-gray-100',
              collapsed ? "justify-center px-0" : ""
            )}
          >
            <item.icon size={20} />
            {!collapsed && <span className="animate-in fade-in">{item.name}</span>}
          </Link>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all border border-transparent"
        >
          {collapsed ? <ChevronRight size={20} className="mx-auto" /> : <><ChevronLeft size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Recolher Menu</span></>}
        </button>

        {!collapsed && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Status Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-gray-600">Sincronizado OK</span>
            </div>
          </div>
        )}

        <div className={cn("flex items-center justify-between px-2 text-gray-400 text-[10px] uppercase font-bold tracking-widest", collapsed ? "justify-center" : "")}>
          {!collapsed && <span>Terminal #02</span>}
          <button onClick={() => auth.signOut()} className="hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function CustomerMenuWrapper() {
  const { tableId } = useParams();
  return <CustomerMenu tableId={tableId || 'table-1'} />;
}
