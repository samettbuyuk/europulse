/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Newspaper, Search, Activity, RefreshCw, Layers, ShieldCheck, Globe, ChevronRight, Menu, Plus, X, Moon, Sun, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Separator } from './components/ui/separator';
import { Toaster, toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './components/ui/dialog';
import { NewsItem } from './types';
import { analyzeNews } from './services/geminiService';

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [keywords, setKeywords] = useState<string[]>(['Transfer', 'Galatasaray', 'Champions League']);
  const [activeKeyword, setActiveKeyword] = useState<string | null>('Transfer');
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [view, setView] = useState('grid');
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const sources = [
    { id: 'all', name: 'Tümü', flag: '🌐' },
    { id: 'marca', name: 'Marca', flag: '🇪🇸' },
    { id: 'as', name: 'AS', flag: '🇪🇸' },
    { id: 'lequipe', name: "L'Equipe", flag: '🇫🇷' },
    { id: 'gazzetta', name: 'Gazzetta', flag: '🇮🇹' },
    { id: 'kicker', name: 'Kicker', flag: '🇩🇪' },
    { id: 'bbc', name: 'BBC', flag: '🇬🇧' },
  ];

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/news${selectedSource !== 'all' ? `?source=${selectedSource}` : ''}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error && (!data.items || data.items.length === 0)) {
        toast.error(`Kaynak hatası: ${data.details || data.error}`);
      } else if (!data.items || data.items.length === 0) {
        toast.info('Haber akışı şu an boş');
      } else {
        toast.success(data.error ? 'Kısmi haber akışı yüklendi' : 'Haberler güncellendi');
      }
      
      setNews(data.items || []);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(`Haber sunucusuna erişilemedi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 600000); // Refresh every 10 mins
    return () => clearInterval(interval);
  }, [selectedSource]);

  const filteredNews = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    let filtered = news.filter(item => {
      const itemDate = new Date(item.pubDate);
      return itemDate >= threeDaysAgo;
    });

    if (activeKeyword) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(activeKeyword.toLowerCase()) || 
        item.contentSnippet.toLowerCase().includes(activeKeyword.toLowerCase())
      );
    }
    
    return filtered;
  }, [news, activeKeyword]);

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setActiveKeyword(newKeyword);
      setNewKeyword('');
      toast.success(`"${newKeyword}" takibe alındı`);
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
    if (activeKeyword === kw) {
      setActiveKeyword(null);
    }
  };

  const runAnalysis = async () => {
    if (!activeKeyword) return;
    setAnalyzing(true);
    const result = await analyzeNews(filteredNews, activeKeyword);
    if (result) {
      setAnalysis(result);
      toast.success('AI Analizi tamamlandı');
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 transition-colors duration-300">
      <Toaster position="top-right" />
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">E</div>
          <span className="font-black text-lg tracking-tighter italic">EURO<span className="text-blue-600">PULSE</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
             {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-xl">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[85%] sm:w-[400px] bg-white dark:bg-zinc-900 z-[70] lg:hidden shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">E</div>
                    <span className="font-black text-lg tracking-tighter italic dark:text-white">EURO<span className="text-blue-600">PULSE</span></span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="rounded-xl">
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-10">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Filtreleme</div>
                    <div className="flex gap-2 mb-4">
                      <Input 
                        placeholder="Keyword..." 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                        className="h-11 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl"
                      />
                      <Button className="h-11 w-11 p-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {keywords.map(kw => (
                         <Badge 
                           key={kw} 
                           variant={activeKeyword === kw ? "default" : "secondary"}
                           onClick={() => { setActiveKeyword(kw); setMobileMenuOpen(false); }}
                           className={`
                             text-xs font-semibold rounded-full border px-3 py-1 flex items-center gap-2 cursor-pointer transition-all
                             ${activeKeyword === kw 
                               ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                               : 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-zinc-700 hover:bg-blue-100'}
                           `}
                         >
                           {kw}
                           <div onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }} className="hover:text-red-500 transition-colors">
                             <X className="h-3 w-3" />
                           </div>
                         </Badge>
                       ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Kaynak Seçimi</div>
                    <div className="grid grid-cols-2 gap-2">
                       {sources.map(s => (
                         <Button 
                          key={s.id} 
                          variant={selectedSource === s.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setSelectedSource(s.id); setMobileMenuOpen(false); }}
                          className={`justify-start h-11 rounded-xl text-xs flex items-center gap-2 border-gray-200 dark:border-zinc-800 ${selectedSource === s.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'}`}
                         >
                          <span className="text-sm">{s.flag}</span>
                          {s.name}
                         </Button>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-2xl text-sm font-bold shadow-xl shadow-blue-500/20" 
                    onClick={() => { runAnalysis(); setMobileMenuOpen(false); }}
                    disabled={analyzing || keywords.length === 0}
                  >
                    {analyzing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                    AI Analizi Yap
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:w-80 lg:flex-col border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 h-screen">
          <div className="flex grow flex-col gap-y-8 overflow-y-auto px-8 pb-6 pt-8">
            <div className="flex h-16 shrink-0 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-2xl tracking-tighter italic leading-none">EURO<span className="text-blue-600">PULSE</span></h1>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Haber İstasyonu</p>
                </div>
              </div>
            </div>
            
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-10">
                <li>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Filtreleme</div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Keyword..." 
                        className="h-10 text-sm bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-blue-500/20" 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                      />
                      <Button onClick={addKeyword} size="sm" variant="outline" className="h-10 px-4 rounded-xl shrink-0 dark:border-zinc-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map(kw => (
                        <Badge 
                          key={kw} 
                          variant={activeKeyword === kw ? "default" : "secondary"}
                          onClick={() => setActiveKeyword(kw)}
                          className={`
                            text-xs font-semibold rounded-full border px-3 py-1 flex items-center gap-2 cursor-pointer transition-all
                            ${activeKeyword === kw 
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                              : 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-zinc-700 hover:bg-blue-100'}
                          `}
                        >
                          {kw}
                          <div 
                            onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}
                            className="hover:bg-red-200 hover:text-red-700 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </div>
                        </Badge>
                      ))}
                      {keywords.length > 0 && (
                        <div className="w-full mt-2 flex items-center gap-3">
                          {activeKeyword && (
                            <button 
                              onClick={() => setActiveKeyword(null)}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors bg-blue-50 dark:bg-zinc-800 px-2 py-1 rounded-full border border-blue-100 dark:border-zinc-700"
                            >
                              Filtreyi Kaldır
                            </button>
                          )}
                          <button 
                            onClick={() => { setKeywords([]); setActiveKeyword(null); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                          >
                            Tümünü Takibi Bırak
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>

                <li>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-4">Kaynak Seçimi</div>
                  <ul role="list" className="space-y-2">
                    {sources.map((source) => (
                      <li key={source.id}>
                        <button
                          onClick={() => setSelectedSource(source.id)}
                          className={`
                            group flex w-full items-center justify-between rounded-xl p-3 text-sm font-medium transition-all
                            ${selectedSource === source.id 
                              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-800'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                             <span className="text-lg">{source.flag}</span>
                             <div className={`w-2 h-2 rounded-full ${
                               source.id === 'marca' ? 'bg-yellow-500' : 
                               source.id === 'lequipe' ? 'bg-red-500' :
                               source.id === 'gazzetta' ? 'bg-pink-500' :
                               source.id === 'as' ? 'bg-blue-400' :
                               source.id === 'all' ? 'bg-gray-900 dark:bg-zinc-100' :
                               'bg-gray-400'
                             }`} />
                             {source.name}
                          </div>
                          {selectedSource === source.id && <ChevronRight className="h-4 w-4" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>

                <li className="mt-auto">
                  <div className="p-5 bg-gray-900 dark:bg-zinc-100 rounded-3xl text-white dark:text-zinc-900 shadow-xl shadow-gray-200 dark:shadow-zinc-950/20 overflow-hidden relative">
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-wider opacity-50 mb-1">AI Analiz Gücü</p>
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-2xl font-bold tracking-tighter">Gemini 3</span>
                        <span className="text-xs opacity-70">Flash</span>
                      </div>
                      <Button 
                        onClick={runAnalysis} 
                        disabled={analyzing || keywords.length === 0}
                        className="w-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl h-10 font-bold transition-all active:scale-[0.98]"
                      >
                        {analyzing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                        Analizi Başlat
                      </Button>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
                  </div>
                  <Button variant="ghost" onClick={toggleTheme} className="w-full mt-4 rounded-xl gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800">
                    {theme === 'light' ? (
                      <><Moon className="h-4 w-4" /> Gece Modu</>
                    ) : (
                      <><Sun className="h-4 w-4" /> Aydınlık Mod</>
                    )}
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:pl-80 flex flex-col min-h-screen">
          <header className="sticky top-0 lg:top-0 z-40 flex flex-col border-b border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
            <div className="flex h-16 shrink-0 items-center justify-between px-6 lg:px-12">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-tighter">
                    {loading ? 'Senkronizasyon...' : `${filteredNews.length} Aktif Haber`}
                  </span>
                  {!loading && (
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                      Son Güncelleme: {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={fetchNews} disabled={loading} className="rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                  <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Mobile Quick Filters */}
            <div className="lg:hidden px-6 pb-3 flex items-center gap-2">
              <div className="flex-1 overflow-x-auto flex items-center gap-2 no-scrollbar scroll-smooth cursor-pointer">
                <Badge 
                  variant={activeKeyword === null ? "default" : "secondary"}
                  onClick={() => setActiveKeyword(null)}
                  className={`
                    text-[10px] font-bold rounded-full px-3 py-1 shrink-0 cursor-pointer
                    ${activeKeyword === null ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'}
                  `}
                >
                  TÜMÜ
                </Badge>
                {keywords.map(kw => (
                  <Badge 
                    key={kw} 
                    variant={activeKeyword === kw ? "default" : "secondary"}
                    onClick={() => setActiveKeyword(kw)}
                    className={`
                      text-[10px] font-bold rounded-full px-3 py-1 shrink-0 cursor-pointer transition-all
                      ${activeKeyword === kw 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'}
                    `}
                  >
                    {kw.toUpperCase()}
                  </Badge>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setMobileMenuOpen(true)}
                className="h-8 w-8 rounded-full shrink-0 border-blue-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </header>

        <div className="flex-1 p-6 lg:p-12 space-y-10">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1">Eşleşen Haberler</p>
              <p className="text-4xl font-light tracking-tighter">
                {filteredNews.length} 
                <span className="text-sm text-green-500 font-bold ml-2">LIVE</span>
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1">Aktif Filtre</p>
              <p className="text-4xl font-light truncate underline decoration-blue-500 decoration-4 underline-offset-8">
                {activeKeyword || 'TÜMÜ'}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest mb-1">Kaynak Çeşitliliği</p>
              <p className="text-4xl font-light tracking-tighter">
                {new Set(filteredNews.map(n => n.sourceName)).size}
                <span className="text-sm text-gray-400 dark:text-zinc-500 font-normal ml-2">Gazete</span>
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {analysis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <Card className="border-none shadow-2xl shadow-blue-500/10 dark:shadow-blue-950/20 overflow-hidden bg-blue-600 dark:bg-blue-900 rounded-[2.5rem]">
                  <div className="px-6 sm:px-10 py-6 border-b border-white/10 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                       <Layers className="h-5 w-5 text-blue-400" />
                       <span className="text-sm font-bold uppercase tracking-widest">AI Gündem Analizi</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`
                        rounded-full px-4 py-1 border-none font-bold text-[10px]
                        ${analysis.sentiment === 'positive' ? 'bg-green-500 text-white' : 
                          analysis.sentiment === 'negative' ? 'bg-red-500 text-white' : 
                          'bg-blue-500 text-white'}
                      `}>
                        {analysis.sentiment.toUpperCase()}
                      </Badge>
                      <button 
                        onClick={() => setAnalysis(null)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="Kapat"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  </div>
                  <CardContent className="p-6 sm:p-10 space-y-8 text-white">
                    <p className="text-base sm:text-lg font-medium leading-relaxed tracking-tight border-l-4 border-white/20 pl-6">
                      {analysis.summary}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                      <div className="space-y-3 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/5">
                        <span className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Önem Derecesi</span>
                        <div className="flex gap-2">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className={`h-6 w-2 rounded-full ${i < analysis.importance ? 'bg-white' : 'bg-white/20'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/5">
                        <span className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Global Trend</span>
                        <p className="text-xl font-bold tracking-tight">{analysis.trend}</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-end">
                      <Button 
                        variant="ghost" 
                        onClick={() => setAnalysis(null)}
                        className="text-white hover:bg-white/10 rounded-2xl gap-2 font-bold text-xs uppercase tracking-widest"
                      >
                        Ana Sayfaya Dön <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[600px] mb-12">
            <Tabs value={view} onValueChange={setView} className="flex-1 flex flex-col">
              <div className="px-6 sm:px-10 py-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-zinc-900 gap-4">
                <h2 className="text-xl font-bold tracking-tight">Canlı Akış & Analiz</h2>
                <TabsList className="bg-gray-100/80 dark:bg-zinc-800 p-1 rounded-2xl w-full sm:w-[200px]">
                  <TabsTrigger value="grid" className="rounded-xl flex-1 text-[10px] uppercase font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">Grid</TabsTrigger>
                  <TabsTrigger value="list" className="rounded-xl flex-1 text-[10px] uppercase font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">Liste</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <TabsContent value="grid" className="p-6 sm:p-8 m-0 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                    {loading ? (
                      Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="animate-pulse space-y-4">
                          <div className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-3xl" />
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-3/4" />
                          <div className="h-20 bg-gray-100 dark:bg-zinc-800 rounded w-full" />
                        </div>
                      ))
                    ) : filteredNews.length > 0 ? (
                      filteredNews.map((item, idx) => (
                        <motion.div
                          key={item.guid || idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card className="h-full border-gray-100 dark:border-zinc-800 hover:border-blue-500/30 transition-all group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 shadow-none hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer flex flex-col">
                            <CardHeader className="p-6 pb-2">
                              <div className="flex justify-between items-center mb-4">
                                <Badge variant="outline" className={`text-[9px] font-black uppercase rounded-lg px-2 py-0.5 border-none flex items-center gap-1 ${
                                  item.sourceName?.includes('Marca') ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500' :
                                  item.sourceName?.includes("L'Equipe") ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-500' :
                                  item.sourceName?.includes('Gazzetta') ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-500' :
                                  item.sourceName?.includes('BBC') ? 'bg-black dark:bg-zinc-800 text-white dark:text-zinc-300' :
                                  item.sourceName?.includes('Kicker') ? 'bg-red-800 text-white' :
                                  'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                                }`}>
                                  <span>{sources.find(s => item.sourceName?.toLowerCase().includes(s.name.toLowerCase()))?.flag || '📰'}</span>
                                  {item.sourceName || 'RSS'}
                                </Badge>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium italic">
                                  {new Date(item.pubDate).toLocaleDateString('tr-TR')} {new Date(item.pubDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <CardTitle className="text-base font-bold leading-tight line-clamp-3 group-hover:text-blue-600 transition-colors">
                                {item.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                              <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-4 leading-relaxed mb-6 font-medium">
                                {item.contentSnippet || item.content}
                              </p>
                              <div className="mt-auto pt-4 border-t border-gray-50 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex gap-2">
                                  {keywords.filter(kw => item.title.toLowerCase().includes(kw.toLowerCase())).map(kw => (
                                    <div key={kw} className={`w-1.5 h-1.5 rounded-full ${activeKeyword === kw ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`} />
                                  ))}
                                </div>
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                >
                                  Habere Git <ChevronRight className="h-3 w-3" />
                                </a>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full py-40 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                          <Search className="h-6 w-6 text-gray-200 dark:text-zinc-700" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Bulunamadı</h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">Kriterlerinize uygun bir haber akışı yakalayamadık.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="list" className="flex-1 p-0 m-0 overflow-y-auto">
                  {loading ? (
                    <div className="p-6 sm:p-10 space-y-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-8">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-1/4" />
                            <div className="h-6 bg-gray-100 dark:bg-zinc-800 rounded w-3/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredNews.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                      {filteredNews.map((item, idx) => (
                        <div key={item.guid || idx} className="px-6 sm:px-10 py-6 hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all flex flex-col sm:flex-row gap-6 sm:gap-8 items-start group">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-zinc-800 shadow-sm ${
                             item.sourceName?.includes('Marca') ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500' :
                             item.sourceName?.includes("L'Equipe") ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-500' :
                             item.sourceName?.includes('Gazzetta') ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-500' :
                             item.sourceName?.includes('BBC') ? 'bg-black dark:bg-zinc-800 text-white dark:text-zinc-300' :
                             item.sourceName?.includes('Kicker') ? 'bg-red-800 text-white' :
                             'bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                          }`}>
                            <span className="text-[10px] font-black uppercase">
                              {sources.find(s => item.sourceName?.toLowerCase().includes(s.name.toLowerCase()))?.flag || '📰'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-2">
                               <div className="flex gap-3 items-center flex-wrap">
                                 <Badge variant="outline" className="text-[9px] font-bold tracking-tighter uppercase rounded-md border-gray-200 dark:border-zinc-800 flex items-center gap-1">
                                   <span>{sources.find(s => item.sourceName?.toLowerCase().includes(s.name.toLowerCase()))?.flag || '📰'}</span>
                                   {item.sourceName}
                                 </Badge>
                                 {keywords.filter(kw => item.title.toLowerCase().includes(kw.toLowerCase())).map(kw => (
                                   <span key={kw} className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide uppercase ${activeKeyword === kw ? 'text-white bg-blue-600' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-zinc-800'}`}>{kw}</span>
                                 ))}
                               </div>
                               <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium italic shrink-0">{new Date(item.pubDate).toLocaleDateString('tr-TR')} {new Date(item.pubDate).toLocaleTimeString('tr-TR')}</span>
                            </div>
                            <h4 className="text-base font-bold group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">{item.title}</h4>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{item.contentSnippet}</p>
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer" className="shrink-0 p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-40 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                        <Search className="h-6 w-6 text-gray-200 dark:text-zinc-700" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Bulunamadı</h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">Kriterlerinize uygun bir haber akışı yakalayamadık.</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  </div>
  );
}
