/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  Copy, 
  Check, 
  Info, 
  Sparkles, 
  Calculator, 
  Share2,
  Calendar,
  CheckCircle2,
  HelpCircle,
  HelpCircle as ShieldCheck,
  Settings,
  Moon,
  Sun
} from 'lucide-react';
import { calcularParcelas, formatBRL, TipoJuros, InstallmentOption } from './utils/calc';

const formatBRLInput = (digits: string): string => {
  if (!digits) return '';
  const v = parseInt(digits, 10) / 100;
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab ] = useState<'principal' | 'configuracoes'>('principal');

  // Input state - raw digit string (e.g. "120000" = R$ 1.200,00)
  const [valorRaw, setValorRawState] = useState('');
  const valorRawRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  const setValorRaw = useCallback((raw: string) => {
    valorRawRef.current = raw;
    setValorRawState(raw);
    if (inputRef.current) {
      inputRef.current.value = formatBRLInput(raw);
    }
  }, []);

  const valorTotalNum = useMemo(() => {
    if (!valorRaw) return 0;
    return parseInt(valorRaw, 10) / 100;
  }, [valorRaw]);

  // Native input handler for reliable mobile cursor control
  const handleValorInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const raw = input.value.replace(/\D/g, '');
    const formatted = formatBRLInput(raw);
    if (formatted !== input.value) {
      input.value = formatted;
      input.setSelectionRange(formatted.length, formatted.length);
    }
    if (raw !== valorRawRef.current) {
      valorRawRef.current = raw;
      setValorRawState(raw);
    }
  }, []);

  const [temJuros, setTemJuros] = useState<boolean>(() => {
    const saved = localStorage.getItem('simulacartao_tem_juros');
    return saved !== null ? saved === 'true' : true;
  });

  const [taxaJuros, setTaxaJuros] = useState<number>(() => {
    const saved = localStorage.getItem('simulacartao_taxa_juros');
    return saved !== null ? parseFloat(saved) : 2.99;
  });

  const [tipoJuros, setTipoJuros] = useState<TipoJuros>(() => {
    const saved = localStorage.getItem('simulacartao_tipo_juros');
    return (saved === 'composto' || saved === 'simples') ? (saved as TipoJuros) : 'composto';
  });

  const [modoTaxas, setModoTaxas] = useState<'global' | 'individual'>(() => {
    const saved = localStorage.getItem('simulacartao_modo_taxas');
    return (saved === 'global' || saved === 'individual') ? (saved as 'global' | 'individual') : 'global';
  });

  const [taxasIndividuais, setTaxasIndividuais] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('simulacartao_taxas_individuais');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      1: 0,
      2: 2.99,
      3: 2.99,
      4: 2.99,
      5: 2.99,
      6: 2.99,
      7: 2.99,
      8: 2.99,
      9: 2.99,
      10: 2.99,
      11: 2.99,
      12: 2.99,
      15: 2.99,
      18: 2.99,
    };
  });

  const [activeInstallmentNum, setActiveInstallmentNum] = useState<number>(12);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('simulacartao_dark_mode');
    return saved !== null ? saved === 'true' : false;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('simulacartao_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('simulacartao_tem_juros', String(temJuros));
  }, [temJuros]);

  useEffect(() => {
    localStorage.setItem('simulacartao_taxa_juros', String(taxaJuros));
  }, [taxaJuros]);

  useEffect(() => {
    localStorage.setItem('simulacartao_tipo_juros', tipoJuros);
  }, [tipoJuros]);

  useEffect(() => {
    localStorage.setItem('simulacartao_modo_taxas', modoTaxas);
  }, [modoTaxas]);

  useEffect(() => {
    localStorage.setItem('simulacartao_taxas_individuais', JSON.stringify(taxasIndividuais));
  }, [taxasIndividuais]);
  
  // Load server config
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  const handleLoadFromServer = useCallback(async () => {
    setLoadStatus('loading');
    try {
      const res = await fetch('/api/config');
      if (!res.ok) { setLoadStatus('error'); setTimeout(() => setLoadStatus('idle'), 2000); return; }
      const data = await res.json();
      if (!data) { setLoadStatus('error'); setTimeout(() => setLoadStatus('idle'), 2000); return; }
      if (data.tem_juros !== undefined) setTemJuros(data.tem_juros === 'true');
      if (data.taxa_juros !== undefined) setTaxaJuros(parseFloat(data.taxa_juros));
      if (data.tipo_juros !== undefined && (data.tipo_juros === 'composto' || data.tipo_juros === 'simples')) setTipoJuros(data.tipo_juros);
      if (data.modo_taxas !== undefined && (data.modo_taxas === 'global' || data.modo_taxas === 'individual')) setModoTaxas(data.modo_taxas);
      if (data.taxas_individuais !== undefined) {
        try { setTaxasIndividuais(JSON.parse(data.taxas_individuais)); } catch {}
      }
      setLoadStatus('loaded');
      setTimeout(() => setLoadStatus('idle'), 2000);
    } catch {
      setLoadStatus('error');
      setTimeout(() => setLoadStatus('idle'), 2000);
    }
  }, []);

  // Load server config on mount
  useEffect(() => { handleLoadFromServer(); }, [handleLoadFromServer]);

  // Settings access gate
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleEnterSettings = () => {
    setSettingsUnlocked(false);
    setPasswordInput('');
    setActiveTab('configuracoes');
  };

  const handleSaveToServer = async () => {
    setSyncStatus('saving');
    try {
      const authRes = await fetch('/api/auth', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: '3692'})});
      if (!authRes.ok) { setSyncStatus('error'); return; }
      const config = {
        tem_juros: String(temJuros),
        taxa_juros: String(taxaJuros),
        tipo_juros: tipoJuros,
        modo_taxas: modoTaxas,
        taxas_individuais: JSON.stringify(taxasIndividuais),
      };
      const res = await fetch('/api/config', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: '3692', config})});
      if (res.ok) setSyncStatus('saved');
      else setSyncStatus('error');
    } catch {
      setSyncStatus('error');
    }
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  // Menu and online state
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Feedback states
  const [copied, setCopied] = useState<boolean>(false);

  const handleAddValue = (amount: number) => {
    const target = valorTotalNum + amount;
    setValorRaw(Math.round(target * 100).toString());
  };

  const handleClear = () => {
    setValorRaw('');
    setActiveInstallmentNum(1);
  };

  const handleUpdateTaxaIndividual = (n: number, val: number) => {
    setTaxasIndividuais(prev => ({
      ...prev,
      [n]: val
    }));
  };

  const handleApplyGlobalToAll = () => {
    setTaxasIndividuais({
      1: 0,
      2: taxaJuros,
      3: taxaJuros,
      4: taxaJuros,
      5: taxaJuros,
      6: taxaJuros,
      7: taxaJuros,
      8: taxaJuros,
      9: taxaJuros,
      10: taxaJuros,
      11: taxaJuros,
      12: taxaJuros,
      15: taxaJuros,
      18: taxaJuros,
    });
  };

  const handleResetAllZero = () => {
    setTaxasIndividuais({
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      15: 0,
      18: 0,
    });
  };

  // Compute installments (1x to 18x)
  const listagemParcelas = useMemo(() => {
    const taxaConfig = modoTaxas === 'global' ? taxaJuros : taxasIndividuais;
    return calcularParcelas(valorTotalNum, temJuros, taxaConfig, tipoJuros);
  }, [valorTotalNum, temJuros, taxaJuros, taxasIndividuais, modoTaxas, tipoJuros]);

  // Find currently active installment details
  const selectedInstallment = useMemo(() => {
    return listagemParcelas.find(p => p.numero === activeInstallmentNum) || listagemParcelas[0];
  }, [listagemParcelas, activeInstallmentNum]);

  // Handle sharing copy simulation
  const handleCopySimulation = () => {
    if (valorTotalNum <= 0) return;

    const linhas = listagemParcelas.map(p => {
      const label = `${p.numero}x ${formatBRL(p.valorParcela)}`;
      const taxa = p.jurosTotal > 0 ? ` (total: ${formatBRL(p.valorTotal)})` : ' (sem juros)';
      return `  ${label}${taxa}`;
    }).join('\n');

    const textSim = `SIMULAÇÃO DE PARCELAMENTO DE CARTÃO

Valor Original: ${formatBRL(valorTotalNum)}

${linhas}

Simulador - Contato Celular`;

    navigator.clipboard.writeText(textSim).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col items-center justify-start font-sans overflow-x-hidden relative px-4 md:px-8 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] select-none">
      
      {/* Luxurious soft atmospheric background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-300/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-300/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
 
      {/* Main Layout Container (Centering wrapper) */}
      <div className="w-full max-w-5xl z-10 space-y-6">
        
        {/* Transparent Responsive Application Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <img src="/logo-contato-celular.png" alt="Logo" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-display">SimulaCartão</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Cálculo de parcelas e juros de cartão de crédito em tempo real</p>
            </div>
          </div>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 cursor-pointer select-none"
            >
              <motion.span
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
              />
              {isOnline ? 'Online' : 'Offline'}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 flex gap-1"
                >
                  <button
                    type="button"
                    onClick={() => { setActiveTab('principal'); setMenuOpen(false); }}
                    className={`p-2 rounded-xl transition-all outline-none border-none select-none cursor-pointer ${
                      activeTab === 'principal'
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Calculator className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleEnterSettings(); setMenuOpen(false); }}
                    className={`p-2 rounded-xl transition-all outline-none border-none select-none cursor-pointer ${
                      activeTab === 'configuracoes'
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {activeTab === 'principal' ? (
          /* Dynamic Multi-column Dashboard layout: Left column inputs/control, Right column list of installments */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT AREA: Control center & active review card. Takes 5 columns on big screen */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Input Card Container */}
              <div className="rounded-3xl p-6 text-white shadow-xl shadow-blue-100 dark:shadow-slate-950/60 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800">
                <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-white/[0.04] rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1">
                    <label htmlFor="valor-input" className="block text-xs font-bold uppercase tracking-wider opacity-90 mb-1.5">
                      Valor total da compra
                    </label>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black opacity-85">R$</span>
                      <input
                        ref={inputRef}
                        id="valor-input"
                        type="tel"
                        placeholder="0,00"
                        onInput={handleValorInput}
                        className="bg-transparent font-black tracking-tight text-2xl sm:text-3xl focus:outline-none w-full text-white placeholder-blue-200 block focus:ring-0"
                      />
                    </div>
                  </div>

                  {valorTotalNum > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold text-white shrink-0"
                    >
                      Limpar
                    </button>
                  )}
                </div>


              </div>

              {/* Simulated Receipt details helper card */}
              <AnimatePresence>
                {valorTotalNum > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <Calendar className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-display">Recibo Selecionado ({selectedInstallment.numero}x)</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">Valor das Parcelas:</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm font-mono">
                          {selectedInstallment.numero}x de {formatBRL(selectedInstallment.valorParcela)}
                        </span>
                      </div>



                      <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">Valor final montante:</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base sm:text-lg font-mono">{formatBRL(selectedInstallment.valorTotal)}</span>
                      </div>
                    </div>


                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={handleCopySimulation}
                        className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all text-white font-bold py-3 px-4 rounded-xl shadow-xs text-sm flex items-center justify-center gap-1.5 cursor-pointer outline-none select-none"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4.5 h-4.5 text-blue-400" />
                            <span>Resumo copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>Compartilhar Simulação</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

             {/* RIGHT AREA: Multi-Option Table lists. Takes 7 columns on big screen */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-display">Tabela Ativa (1x a 18x)</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold select-none">Selecione para ver o recibo</span>
              </div>

              {valorTotalNum <= 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-4 shadow-xs">
                    <Calculator className="w-6.5 h-6.5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Pronto para a Simulação</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    Digite qualquer preço no campo superior da compra para calcular na hora todos os planos de 1x a 18x parcelados.
                  </p>
                </div>
              ) : (
                /* A neat grid on wider screens (grid-cols-2) and a fluid list on mobile formats */
                <div className="grid grid-cols-1 gap-3">
                  {listagemParcelas.map((opt) => {
                    const isSelected = opt.numero === activeInstallmentNum;
                    const taxaAplicada = modoTaxas === 'global' ? taxaJuros : (taxasIndividuais[opt.numero] ?? 0);
                    return (
                      <button
                        type="button"
                        key={opt.numero}
                        onClick={() => setActiveInstallmentNum(opt.numero)}
                        className={`w-full text-left p-3 rounded-2xl transition-all border outline-none cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-md ring-1 ring-blue-500/10'
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-100 dark:border-slate-800 shadow-xs hover:border-slate-200 dark:hover:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-sm font-black ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {opt.numero}x
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 font-display">
                              {opt.numero}x de {formatBRL(opt.valorParcela)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pl-2 shrink-0">
                          <div className="text-right">
                            {opt.jurosTotal <= 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                Sem taxas
                              </span>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                                  Total: {formatBRL(opt.valorTotal)}
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : !settingsUnlocked ? (
          /* PASSWORD GATE */
          <div className="max-w-5xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-xs transition-colors duration-300 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-md">
                <Settings className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display">Configurações Protegidas</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Digite a senha para acessar</p>
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={passwordInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setPasswordInput(v);
                  if (v === '3692') {
                    setSettingsUnlocked(true);
                  }
                }}
                className="w-full text-center text-2xl font-extrabold tracking-[0.5em] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="····"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setActiveTab('principal')}
                className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-semibold cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          /* CONFIGURACOES TAB VIEW */
          <div className="max-w-5xl mx-auto space-y-5">
            
            {/* Header info settings context */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-xs transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display flex items-center gap-2">
                    <Settings className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" />
                    Configurações da Simulação
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Ajuste as regras de encargos e modalidade de cálculo aplicadas ao parcelamento ativo do SimulaCartão.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToServer}
                    className={`text-xs font-bold cursor-pointer shrink-0 px-3 py-1.5 rounded-lg transition-all ${
                      syncStatus === 'saved'
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                        : syncStatus === 'error'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    }`}
                  >
                    {syncStatus === 'saving' ? 'Salvando…' : syncStatus === 'saved' ? 'Salvo ✓' : syncStatus === 'error' ? 'Erro' : 'Salvar no Servidor'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadFromServer}
                    className={`text-xs font-bold cursor-pointer shrink-0 px-3 py-1.5 rounded-lg transition-all ${
                      loadStatus === 'loaded'
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                        : loadStatus === 'error'
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    {loadStatus === 'loading' ? 'Carregando…' : loadStatus === 'loaded' ? 'Ok ✓' : loadStatus === 'error' ? 'Erro' : 'Recarregar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSettingsUnlocked(false); setPasswordInput(''); setActiveTab('principal'); }}
                    className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer shrink-0"
                  >
                    Trancar
                  </button>
                </div>
              </div>
            </div>

            {/* Dark Mode toggle card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-xs space-y-4 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-300">
                    {isDarkMode ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block">Modo Escuro</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ativar visual escuro para o aplicativo</span>
                  </div>
                </div>
                
                {/* Advanced Light/Dark Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none select-none flex items-center ${
                    isDarkMode ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
                  }`}
                >
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 bg-white rounded-full shadow-md" 
                  />
                </button>
              </div>
            </div>

            {/* Interest controls card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 block">Cobrança de Juros</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Habilitar ou desabilitar taxas</span>
                </div>
                
                {/* Advanced Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    setTemJuros(!temJuros);
                    if (temJuros) {
                      setActiveInstallmentNum(12);
                    }
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none select-none flex items-center ${
                    temJuros ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
                  }`}
                >
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 bg-white rounded-full shadow-md" 
                  />
                </button>
              </div>

              {/* Dynamic properties under temJuros active mode */}
              <AnimatePresence initial={false}>
                {temJuros && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 overflow-hidden"
                  >
                    {/* Modalidade de Cálculo */}
                    <div>
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 font-display uppercase tracking-wider">Modalidade de Cálculo</span>
                      <div className="flex bg-slate-50 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setTipoJuros('composto')}
                          className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all text-center cursor-pointer select-none ${
                            tipoJuros === 'composto'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Juros Compostos
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoJuros('simples')}
                          className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all text-center cursor-pointer select-none ${
                            tipoJuros === 'simples'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Juros Simples
                        </button>
                      </div>
                    </div>

                    {/* Mode selector (Global vs Individual) */}
                    <div>
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 font-display uppercase tracking-wider">Definição dos Juros</span>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setModoTaxas('global')}
                          className={`py-2 rounded-lg text-sm font-extrabold transition-all text-center cursor-pointer select-none ${
                            modoTaxas === 'global'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Taxa Global Única
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoTaxas('individual')}
                          className={`py-2 rounded-lg text-sm font-extrabold transition-all text-center cursor-pointer select-none ${
                            modoTaxas === 'individual'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Taxas por Parcelas
                        </button>
                      </div>
                    </div>

                    {modoTaxas === 'global' ? (
                      /* GLOBAL MODE SETTINGS */
                      <div className="space-y-4 pt-1">
                        <div>
                          <label htmlFor="taxa-input-v3" className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
                            Taxa Geral ao mês (% a.m.)
                          </label>
                          <div className="relative rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-within:border-blue-500 transition-all flex items-center px-3 py-2">
                            <input
                              id="taxa-input-v3"
                              type="number"
                              step="0.01"
                              value={taxaJuros || ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setTaxaJuros(isNaN(v) ? 0 : v);
                              }}
                              className="w-full bg-transparent text-slate-800 dark:text-slate-100 font-extrabold text-sm focus:outline-none"
                              placeholder="0.00"
                            />
                            <span className="text-slate-400 dark:text-slate-500 text-xs font-bold ml-1 font-mono">% a.m.</span>
                          </div>
                        </div>

                        {/* Quick suggestion parameters */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider shrink-0">Presets:</span>
                          <div className="flex-1 flex gap-1.5 justify-between">
                            {[1.99, 2.99, 3.99, 5.99].map((val) => (
                              <button
                                type="button"
                                key={val}
                                onClick={() => setTaxaJuros(val)}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                                  taxaJuros === val
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40'
                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent dark:border-slate-850'
                                }`}
                              >
                                {val}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* INDIVIDUAL INSTALLMENTS MODE SETTINGS */
                      <div className="space-y-4 pt-1">
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                          <p className="font-bold leading-normal text-sm">Porcentagem Customizada por Parcela</p>
                          <p className="opacity-90 leading-normal">Defina um valor independente para cada intervalo de parcelamento. Parcelas com taxa zerada (0) serão calculadas sem encargos.</p>
                        </div>

                        {/* Quick utility controls for bulk individual setting */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleApplyGlobalToAll}
                            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-[0.98] transition-all text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer outline-none select-none text-center"
                          >
                            Replicar Global ({taxaJuros}%)
                          </button>
                          <button
                            type="button"
                            onClick={handleResetAllZero}
                            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 active:scale-[0.98] transition-all text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer outline-none select-none text-center"
                          >
                            Zerar todas parcelas
                          </button>
                        </div>

                        {/* Grid of 14 installment entries */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18].map((n) => {
                            const val = taxasIndividuais[n] ?? 0;
                            return (
                              <div key={n} className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-100 dark:border-slate-800/80 shadow-3xs flex flex-col gap-1">
                                <label htmlFor={`indiv-tax-${n}`} className="text-xs font-extrabold text-slate-700 dark:text-slate-300 font-display">
                                  {n}x parcelado
                                </label>
                                <div className="relative flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850/80 focus-within:border-blue-500 rounded-lg px-2 py-1">
                                  <input
                                    id={`indiv-tax-${n}`}
                                    type="number"
                                    step="0.01"
                                    value={val || ''}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      handleUpdateTaxaIndividual(n, isNaN(v) ? 0 : v);
                                    }}
                                    className="w-full bg-transparent text-slate-800 dark:text-slate-100 font-extrabold text-xs focus:outline-none text-left"
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-bold ml-1">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        )}

        {/* Footer info/attribution */}
        <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
          SimulaCartão • Contato Celular - Todos os direitos reservados
        </div>

      </div>

    </div>
  );
}
