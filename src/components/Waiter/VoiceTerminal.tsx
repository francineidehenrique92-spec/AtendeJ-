import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Check, Loader2, ClipboardList, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processVoiceCommand } from '../../services/gemini';
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { decrementStock, printThermalOrder } from '../../services/inventoryService';
import { CreditCard, UtensilsCrossed } from 'lucide-react';

export default function VoiceTerminal() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderPreview, setOrderPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load Tables for alerts
    const q = query(collection(db, 'restaurants', 'default', 'tables'), orderBy('number', 'asc'));
    const unsubscribeTables = onSnapshot(q, (snap) => {
      setTables(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
    return () => unsubscribeTables();
  }, []);

  const handleResolveAlert = async (tableId: string) => {
    try {
      await updateDoc(doc(db, 'restaurants', 'default', 'tables', tableId), {
        callWaiter: false,
        requestBill: false,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript) handleProcessCommand();
    } else {
      setTranscript('');
      setOrderPreview(null);
      setError(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleProcessCommand = async () => {
    if (!transcript.trim()) return;
    
    setProcessing(true);
    setError(null);
    try {
      const result = await processVoiceCommand(transcript);
      setOrderPreview(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar áudio');
    } finally {
      setProcessing(false);
    }
  };

  const confirmOrder = async () => {
    if (!orderPreview) return;
    setProcessing(true);
    try {
      const { mesa } = orderPreview.header;
      
      // Find the actual document ID for the table number
      const targetTable = tables.find(t => t.number === parseInt(mesa));
      if (!targetTable) {
        throw new Error(`Mesa ${mesa} não encontrada no sistema.`);
      }
      const tableId = targetTable.id;
      
      // Create order
      const orderData = {
        tableId,
        status: 'preparing',
        type: 'waiter',
        total: orderPreview.itens.reduce((acc: number, item: any) => acc + (item.price || 0) * item.qtd, 0), // Note: AI might not have prices, we'd normally lookup
        items: orderPreview.itens.map((it: any) => ({
          ...it,
          status: 'pending'
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'restaurants', 'default', 'orders'), orderData);
      
      // Update table status
      await updateDoc(doc(db, 'restaurants', 'default', 'tables', tableId), {
        status: 'busy',
        updatedAt: serverTimestamp()
      });

      // Decrement Inventory
      const itemsToDecrement = orderData.items.map((it: any) => ({
        name: it.produto,
        qty: it.qtd
      }));
      await decrementStock(itemsToDecrement).catch(console.error);

      // Simulate Thermal Printer
      printThermalOrder({
        tableNumber: mesa,
        items: orderData.items.map((it: any) => ({
          name: it.produto,
          qty: it.qtd,
          ponto: it.ponto,
          obs: it.obs
        }))
      });

      setOrderPreview(null);
      setTranscript('');
      alert('Pedido enviado para a cozinha e impresso com sucesso!');
    } catch (err) {
      setError('Erro ao salvar pedido');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Mic size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 italic tracking-tight">Terminal de <span className="text-orange-600">Voz</span></h2>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Garçom Ativo: Roberto P.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronizado</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-8 gap-8 overflow-hidden">
        {/* Voice Input Section */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 bg-white border border-gray-200 rounded-[40px] p-12 flex flex-col items-center justify-center gap-10 relative overflow-hidden shadow-sm">
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <div className="w-96 h-96 border-4 border-orange-500 rounded-full animate-ping" />
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className={cn(
                "w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-lg relative z-10 border-4",
                isListening 
                  ? "bg-red-500 border-red-400 scale-110 shadow-red-100" 
                  : "bg-orange-600 border-orange-500 hover:scale-105 shadow-orange-100"
              )}
            >
              {isListening ? <MicOff size={64} className="text-white" /> : <Mic size={64} className="text-white" />}
              
              {/* Sound Waves Animation */}
              {isListening && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute inset-0 border-2 border-red-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </motion.button>

            <div className="text-center space-y-3">
              <p className="text-2xl font-black italic text-gray-900 tracking-tight">
                {isListening ? 'Aguardando voz...' : 'Pressione para iniciar'}
              </p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto font-medium">
                "Duas Original gelada, uma picanha ao ponto e um hambúrguer gourmet."
              </p>
            </div>

            <div className="w-full max-w-xl space-y-4">
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-[24px] shadow-inner">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Sua fala aparecerá aqui ou digite o comando manualmente..."
                  className="w-full bg-transparent border-none focus:ring-0 text-base italic leading-relaxed text-center text-gray-900 resize-none h-24 placeholder:text-gray-300"
                />
              </div>
              
              {!isListening && transcript && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleProcessCommand}
                  className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={18} />
                  Processar Comando Manual
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Alerts or Order Preview */}
        <div className="w-full md:w-[450px] flex flex-col gap-8 overflow-hidden">
          {/* Active Atendimento Alerts */}
          <div className="bg-white rounded-[40px] border border-gray-200 p-8 shadow-sm flex flex-col max-h-[400px]">
             <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <AlertCircle size={14} className="text-orange-500" />
                Atendimento Ativo
              </h3>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-black uppercase">
                {tables.filter(t => t.callWaiter || t.requestBill).length} Chamados
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {tables.filter(t => t.callWaiter || t.requestBill).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300 opacity-50">
                  <ClipboardList size={40} strokeWidth={1} className="mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum chamado ativo</p>
                </div>
              ) : (
                tables.filter(t => t.callWaiter || t.requestBill).map(table => (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={table.id} 
                    className={`p-4 rounded-3xl border flex items-center justify-between gap-4 transition-all ${
                      table.requestBill ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200 shadow-sm shadow-orange-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${table.requestBill ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                        {table.requestBill ? <CreditCard size={20} /> : <UtensilsCrossed size={20} />}
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 italic tracking-tight uppercase">Mesa {table.number}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${table.requestBill ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {table.requestBill ? 'Pediu a Conta' : 'Chamou Garçom'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolveAlert(table.id)}
                      className="bg-gray-100 hover:bg-gray-200 border border-gray-200 p-3 rounded-2xl text-gray-500 hover:text-gray-900 transition-all active:scale-90"
                    >
                      <Check size={18} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <AnimatePresence>
            {orderPreview && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="flex-1 bg-white rounded-[40px] border border-gray-200 flex flex-col shadow-xl overflow-hidden"
              >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="text-lg font-black italic text-gray-900 flex items-center gap-3 tracking-tight">
                  <ClipboardList size={22} className="text-orange-600" />
                  Conferência <span className="text-orange-600">IA</span>
                </h3>
                <button onClick={() => setOrderPreview(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-3xl text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Mesa</p>
                    <p className="text-4xl font-black italic text-gray-900">{orderPreview.header.mesa}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-3xl text-center flex flex-col justify-center">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Status</p>
                    <p className="text-xs font-black uppercase text-emerald-600 tracking-tighter">{orderPreview.header.tipo_acao.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Comanda Operacional</p>
                  {orderPreview.itens.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-5 rounded-3xl border border-gray-200 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="font-black italic text-xl text-gray-900">{item.qtd}x {item.produto}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.ponto && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] rounded-full border border-orange-200 font-black uppercase tracking-tighter">
                            PONTO: {item.ponto}
                          </span>
                        )}
                        {item.obs?.map((ob: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-200 text-gray-600 text-[10px] rounded-full border border-gray-300 font-bold uppercase">
                            {ob}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {orderPreview.flags.pendencia && (
                  <div className="bg-red-50 border border-red-200 p-6 rounded-3xl flex items-center gap-4 text-red-600">
                    <AlertCircle size={28} className="flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest leading-none mb-1">Ação Requerida</p>
                      <p className="text-sm font-bold leading-tight">{orderPreview.flags.pendencia}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-gray-200 bg-gray-50 flex gap-4">
                <button 
                  onClick={() => setOrderPreview(null)}
                  className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-2xl transition-all"
                >
                  Descartar
                </button>
                <button
                  onClick={confirmOrder}
                  disabled={processing}
                  className="flex-[2] py-4 font-black uppercase text-xs tracking-[0.2em] text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-2xl shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3"
                >
                  {processing ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                  Enviar Cozinha
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Overlay */}
        {processing && !orderPreview && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
              <p className="font-bold text-xl tracking-tight">IA está processando...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
