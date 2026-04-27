import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { LayoutGrid, Package, ChefHat, Utensils, QrCode, ClipboardList, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import Dashboard from './components/Manager/Dashboard';
import InventoryManager from './components/Manager/Inventory';
import TableManager from './components/Manager/Tables';
import KDS from './components/Manager/KDS';
import VoiceTerminal from './components/Waiter/VoiceTerminal';
import CustomerMenu from './components/Customer/Menu';
import { initializeMockData } from './mockData';
import { cn } from './lib/utils';
import { Table } from './types';

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
            <Route path="/customer" element={<CustomerLanding />} />
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (location.pathname.startsWith('/customer')) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutGrid },
    { name: 'Mesas QR', path: '/tables', icon: QrCode },
    { name: 'KDS Cozinha', path: '/kds', icon: ChefHat },
    { name: 'Inventário', path: '/inventory', icon: Package },
    { name: 'Garçom Voz', path: '/waiter', icon: ClipboardList },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-black text-sm">AI</div>
          <h1 className="font-bold text-gray-900">GastroVoz</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500">
          <LayoutGrid size={24} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col p-8 md:hidden animate-in fade-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-black italic">MENU</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl font-bold transition-all text-lg",
                  location.pathname === item.path ? "bg-orange-600 text-white shadow-xl shadow-orange-100" : "bg-gray-50 text-gray-500"
                )}
              >
                <item.icon size={24} />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className={cn(
        "hidden md:flex bg-white border-r border-gray-100 flex-col p-6 gap-2 shadow-sm relative z-10 transition-all duration-300",
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
    </>
  );
}

function CustomerMenuWrapper() {
  const { tableId } = useParams();
  return <CustomerMenu tableId={tableId || 'table-1'} />;
}

function CustomerLanding() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'restaurants', 'default', 'tables'), orderBy('number', 'asc'));
    return onSnapshot(q, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <header className="text-center mb-12">
        <div className="w-16 h-16 bg-orange-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-2xl shadow-orange-900/20">GV</div>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Seja Bem-vindo</h1>
        <p className="text-orange-500 font-bold uppercase tracking-widest text-[10px] mt-2">Escolha sua mesa para começar</p>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-lg">
          {tables.map(table => (
            <Link 
              key={table.id}
              to={`/customer/${table.id}`}
              className={cn(
                "h-32 rounded-[32px] border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group",
                table.status === 'busy' ? "border-white/10 bg-white/5 opacity-50 grayscale" : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500"
              )}
            >
              <span className="text-3xl font-black italic group-hover:scale-110 transition-transform">{table.number}</span>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-50">
                {table.status === 'busy' ? 'Indisponível' : 'Selecionar'}
              </span>
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-auto pt-12 text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">
        GastroVoz AI • Intelligent Dining
      </footer>
    </div>
  );
}
