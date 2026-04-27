import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Check, Loader2, ClipboardList, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processVoiceCommand } from '../../services/gemini';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { decrementStock, printThermalOrder } from '../../services/inventoryService';

export default function VoiceTerminal() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderPreview, setOrderPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
  }, []);

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
      const { mesa, tipo_acao } = orderPreview.header;
      const tableId = `table-${mesa}`;
      
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
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Mic size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white italic tracking-tight">Terminal de <span className="text-orange-500">Voz</span></h2>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Garçom Ativo: Roberto P.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-full border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizado</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-8 gap-8 overflow-hidden">
        {/* Voice Input Section */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[40px] p-12 flex flex-col items-center justify-center gap-10 relative overflow-hidden shadow-2xl">
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-96 h-96 border-4 border-orange-500 rounded-full animate-ping" />
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleListening}
              className={cn(
                "w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 border-4",
                isListening 
                  ? "bg-red-500 border-red-400 scale-110" 
                  : "bg-orange-500 border-orange-400 hover:scale-105"
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
              <p className="text-2xl font-black italic text-white tracking-tight">
                {isListening ? 'Aguardando voz...' : 'Pressione para iniciar'}
              </p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                "Duas Original gelada, uma picanha ao ponto e um hambúrguer gourmet."
              </p>
            </div>

            <div className="w-full max-w-xl space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-[24px] shadow-inner">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Sua fala aparecerá aqui ou digite o comando manualmente..."
                  className="w-full bg-transparent border-none focus:ring-0 text-base italic leading-relaxed text-center text-slate-200 resize-none h-24 placeholder:text-slate-700"
                />
              </div>
              
              {!isListening && transcript && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleProcessCommand}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={18} />
                  Processar Comando Manual
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Order Preview Section */}
        <AnimatePresence>
          {orderPreview && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-full md:w-[450px] bg-slate-900 rounded-[40px] border border-slate-800 flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h3 className="text-lg font-black italic text-white flex items-center gap-3 tracking-tight">
                  <ClipboardList size={22} className="text-orange-500" />
                  Conferência <span className="text-orange-500">IA</span>
                </h3>
                <button onClick={() => setOrderPreview(null)} className="text-slate-600 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl text-center">
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1">Mesa</p>
                    <p className="text-4xl font-black italic text-white">{orderPreview.header.mesa}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl text-center flex flex-col justify-center">
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1">Status</p>
                    <p className="text-xs font-black uppercase text-emerald-400 tracking-tighter">{orderPreview.header.tipo_acao.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Comanda Operacional</p>
                  {orderPreview.itens.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <span className="font-black italic text-xl text-white">{item.qtd}x {item.produto}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.ponto && (
                          <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[10px] rounded-full border border-orange-500/20 font-black uppercase tracking-tighter">
                            PONTO: {item.ponto}
                          </span>
                        )}
                        {item.obs?.map((ob: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] rounded-full border border-slate-700/50 font-bold uppercase">
                            {ob}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {orderPreview.flags.pendencia && (
                  <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 text-red-500">
                    <AlertCircle size={28} className="flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest leading-none mb-1">Ação Requerida</p>
                      <p className="text-sm font-bold leading-tight">{orderPreview.flags.pendencia}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-900/80 flex gap-4">
                <button 
                  onClick={() => setOrderPreview(null)}
                  className="flex-1 py-4 font-black uppercase text-xs tracking-widest text-slate-500 hover:text-white bg-slate-800 rounded-2xl transition-all"
                >
                  Descartar
                </button>
                <button
                  onClick={confirmOrder}
                  disabled={processing}
                  className="flex-[2] py-4 font-black uppercase text-xs tracking-[0.2em] text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-2xl shadow-xl shadow-orange-950/20 transition-all flex items-center justify-center gap-3"
                >
                  {processing ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                  Enviar Cozinha
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
