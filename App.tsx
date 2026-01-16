
import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, Upload, Wand2, Download, Mic, Play, Pause, Hand, 
  Layers, Shirt, User, Zap, X, Image as ImageIcon, Volume2, 
  Sun, Moon, Grid, Eye, EyeOff, ChevronDown, Sparkles, ChevronLeft, 
  ChevronRight, Tag, Megaphone, Lock, UserCheck, Layout, RefreshCw, AlertCircle,
  Home, Package, BarChart3, LogOut, Menu, UserPlus, Camera, Users, Maximize2,
  Scan, ArrowLeft, Frame, Trash2
} from 'lucide-react';
import { VOICES, CTA_OPTIONS } from './constants';
import { SleeveType, HandCount, ThemeMode, AspectRatio } from './types';
import { 
  generateProductScript, 
  generateProductImage, 
  generateTTS, 
  decodePCM, 
  decodeAudioData,
  encodeWav,
  generateProductMixImage,
  generateMixScript
} from './services/geminiService';

const withRetry = async <T,>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 2000,
  onRetry?: (count: number) => void
): Promise<T> => {
  try { return await fn(); } catch (error) {
    if (retries <= 0) throw error;
    if (onRetry) onRetry(retries);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5, onRetry);
  }
};

const resizeImage = (base64Str: string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
      else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('product-pov');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme & Shared Editor State
  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.DARK);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Shared Generation Config
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // POV Tab State
  const [image, setImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [handCount, setHandCount] = useState<HandCount>('1');
  const [sleeveType, setSleeveType] = useState<SleeveType>('long');

  // MIX Tab State
  const [mixImages, setMixImages] = useState<(string | null)[]>([null, null, null]);
  const [mixBackground, setMixBackground] = useState<string | null>(null);
  const [mixFaceReference, setMixFaceReference] = useState<string | null>(null);
  const [mixPrompt, setMixPrompt] = useState("");
  const [mixGender, setMixGender] = useState("Wanita");
  const [mixAge, setMixAge] = useState("25");
  const [mixAngle, setMixAngle] = useState("Eye Level");
  const [mixFraming, setMixFraming] = useState("Setengah Badan");
  const [mixIsHijab, setMixIsHijab] = useState(false);

  // TTS Shared State
  const [ttsText, setTtsText] = useState("");
  const [productTheme, setProductTheme] = useState(""); 
  const [ctaType, setCtaType] = useState('soft');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const isDark = themeMode === ThemeMode.DARK;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setThemeMode(prev => prev === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK);

  const handleGenerateVariations = async () => {
    if (!image) return alert("Unggah foto produk terlebih dahulu.");
    if (!process.env.API_KEY) return alert("API Key tidak ditemukan. Pastikan sudah dikonfigurasi.");
    
    setIsLoading(true); setGeneratedImages([]); setSelectedImageIndex(null);
    try {
      setLoadingStep("Mengoptimalkan gambar...");
      const optimizedProduct = await resizeImage(image);
      let backgroundBase64 = null;
      if (backgroundImage) backgroundBase64 = await resizeImage(backgroundImage);

      const currentResults: string[] = [];
      for (let i = 0; i < 4; i++) {
        setLoadingStep(`Membuat Variasi ${i + 1} (Ultra HD)...`);
        const result = await withRetry(() => generateProductImage({
          base64Image: optimizedProduct,
          base64Background: backgroundBase64,
          prompt: imagePrompt || "Professional product photography in context, high resolution, ultra detail",
          handCount,
          sleeveType,
          includeHands: i !== 2,
          isReview: i === 3,
          aspectRatio: aspectRatio
        }));
        if (result) {
          currentResults.push(result);
          setGeneratedImages([...currentResults]);
        }
      }
    } catch (error: any) {
      console.error("POV Generation Error:", error);
      alert(`Gagal membuat variasi: ${error.message || "Terjadi kesalahan jaringan"}`);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleGenerateMixVariations = async () => {
    const activeProducts = mixImages.filter(img => img !== null) as string[];
    if (activeProducts.length === 0) return alert("Unggah minimal 1 produk untuk memulai.");
    if (!process.env.API_KEY) return alert("API Key tidak ditemukan.");
    
    setIsLoading(true); setGeneratedImages([]); setSelectedImageIndex(null);
    try {
      setLoadingStep("Menyiapkan aset...");
      const optimizedProducts = await Promise.all(activeProducts.map(img => resizeImage(img)));
      let backgroundBase64 = null;
      if (mixBackground) backgroundBase64 = await resizeImage(mixBackground);
      let faceRefBase64 = null;
      if (mixFaceReference) faceRefBase64 = await resizeImage(mixFaceReference);

      const currentResults: string[] = [];
      for (let i = 0; i < 4; i++) {
        setLoadingStep(`Memproses Mix ${i + 1} (Ultra HD)...`);
        const result = await withRetry(() => generateProductMixImage({
          productImages: optimizedProducts,
          backgroundImage: backgroundBase64,
          faceReference: faceRefBase64,
          prompt: mixPrompt || `Affiliate product showcase with model ${mixGender}`,
          gender: mixGender,
          age: mixAge,
          angle: mixAngle,
          framing: mixFraming,
          isHijab: mixIsHijab,
          aspectRatio: aspectRatio
        }));
        if (result) {
          currentResults.push(result);
          setGeneratedImages([...currentResults]);
        }
      }
    } catch (error: any) {
      console.error("Mix Generation Error:", error);
      alert(`Mix Gagal: ${error.message || "Periksa koneksi internet Anda"}`);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleAutoPromptMix = () => {
    const hijabText = mixIsHijab ? "mengenakan hijab modis," : "";
    setMixPrompt(`Professional commercial photography, model ${mixGender} ${hijabText} usia ${mixAge} berpose natural memamerkan produk-produk ini, pencahayaan studio ultra HD, suasana modern.`);
  };

  const handleAutoPromptPOV = () => {
    setImagePrompt(`Foto produk profesional ultra HD, pencahayaan studio estetik, dipegang POV ${handCount} tangan dengan lengan ${sleeveType}.`);
  };

  const handleGenerateScriptInternal = async () => {
    if (activeTab === 'product-pov' && !image) return alert("Unggah foto produk.");
    if (activeTab === 'product-mix' && mixImages.filter(Boolean).length === 0) return alert("Unggah minimal 1 produk.");

    setIsScriptLoading(true);
    try {
      let script = "";
      if (activeTab === 'product-pov') {
        script = await withRetry(() => generateProductScript({
          productDescription: imagePrompt || productTheme,
          theme: productTheme,
          ctaType,
          base64Image: image
        }));
      } else {
        script = await withRetry(() => generateMixScript({
          productContext: mixPrompt || productTheme,
          products: mixImages,
          ctaType
        }));
      }
      setTtsText(script.replace(/["']/g, "").trim());
      audioBufferRef.current = null;
    } catch (error) { alert("Gagal membuat naskah."); } finally { setIsScriptLoading(false); }
  };

  const handlePlayTTS = async () => {
    if (!ttsText) return;
    if (audioBufferRef.current) { playLocalBuffer(); return; }
    setIsTtsLoading(true);
    try {
      const base64Audio = await withRetry(() => generateTTS(ttsText, selectedVoice));
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        const pcmData = decodePCM(base64Audio);
        const buffer = await decodeAudioData(pcmData, ctx, 24000, 1);
        audioBufferRef.current = buffer;
        playLocalBuffer();
        const wavBlob = encodeWav(pcmData, 24000); 
        const mp3LikeBlob = new Blob([wavBlob], { type: 'audio/mpeg' });
        setMp3Url(URL.createObjectURL(mp3LikeBlob));
      }
    } catch (error) { alert("Gagal memproses suara."); } finally { setIsTtsLoading(false); }
  };

  const playLocalBuffer = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
  };

  const handleStopAudio = () => {
    if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
    setIsPlaying(false);
  };

  const themeClasses = {
    bg: isDark ? 'bg-neutral-950' : 'bg-slate-50',
    header: isDark ? 'bg-neutral-950/80 border-b border-neutral-900' : 'bg-white/80 border-b border-slate-200 shadow-sm',
    sidebar: isDark ? 'bg-neutral-950 border-r border-neutral-900' : 'bg-white border-r border-slate-200 shadow-xl',
    card: isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-slate-200 shadow-sm',
    input: isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800',
    text: isDark ? 'text-neutral-200' : 'text-slate-700',
    menuItem: (active: boolean) => active 
      ? (isDark ? 'bg-lime-500/10 text-lime-500 border-r-2 border-lime-500' : 'bg-lime-500/10 text-lime-600 border-r-2 border-lime-500') 
      : (isDark ? 'text-neutral-400 hover:bg-neutral-900 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'),
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text} flex flex-col lg:flex-row`}>
      {/* PREVIEW MODAL */}
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex gap-3 sm:gap-4 z-50">
             <a 
               href={generatedImages[selectedImageIndex]} 
               download={`studio-arkanum-${selectedImageIndex}.png`} 
               className="p-3 bg-lime-500 text-black rounded-full hover:bg-lime-400 transition-all hover:scale-110 active:scale-95 shadow-xl shadow-lime-500/20"
               title="Download"
             >
               <Download className="w-6 h-6" />
             </a>
             <button 
               onClick={() => setSelectedImageIndex(null)} 
               className="p-3 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all hover:scale-110 active:scale-95 border border-white/10"
               title="Tutup"
             >
               <X className="w-6 h-6" />
             </button>
          </div>
          
          <div className="relative w-full max-w-4xl aspect-square flex items-center justify-center">
             <img src={generatedImages[selectedImageIndex]} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/5" alt="Preview" />
             <div className="absolute inset-y-0 -left-2 sm:-left-16 flex items-center">
               <button onClick={() => setSelectedImageIndex(prev => prev! > 0 ? prev! - 1 : generatedImages.length - 1)} className="p-3 rounded-full bg-white/5 text-white hover:bg-lime-500 hover:text-black border border-white/10 backdrop-blur-md transition-all"><ChevronLeft className="w-6 h-6 lg:w-8 lg:h-8" /></button>
             </div>
             <div className="absolute inset-y-0 -right-2 sm:-right-16 flex items-center">
               <button onClick={() => setSelectedImageIndex(prev => prev! < generatedImages.length - 1 ? prev! + 1 : 0)} className="p-3 rounded-full bg-white/5 text-white hover:bg-lime-500 hover:text-black border border-white/10 backdrop-blur-md transition-all"><ChevronRight className="w-6 h-6 lg:w-8 lg:h-8" /></button>
             </div>
          </div>
          
          <div className="mt-8 text-center space-y-2 hidden lg:block">
             <p className="text-lime-500 font-black tracking-widest uppercase text-xs">Variasi Studio {selectedImageIndex + 1}</p>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-[60] h-full transition-all duration-300 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} ${themeClasses.sidebar} overflow-hidden`}>
        <div className="h-full flex flex-col p-4 w-64 lg:w-full">
          <div className="flex items-center gap-3 mb-10 px-2 mt-2">
            <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center shadow-lg"><Zap className="text-black w-6 h-6 fill-black" /></div>
            {(sidebarOpen || window.innerWidth < 1024) && <h1 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>AI <span className="text-lime-500">Affiliate</span></h1>}
          </div>
          <nav className="flex-grow space-y-2">
            <button onClick={() => { setActiveTab('product-pov'); setGeneratedImages([]); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${themeClasses.menuItem(activeTab === 'product-pov')}`}><Hand className="w-5 h-5" />{(sidebarOpen || window.innerWidth < 1024) && <span>POV Tangan</span>}</button>
            <button onClick={() => { setActiveTab('product-mix'); setGeneratedImages([]); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${themeClasses.menuItem(activeTab === 'product-mix')}`}><Layers className="w-5 h-5" />{(sidebarOpen || window.innerWidth < 1024) && <span>Produk Mix</span>}</button>
            <button onClick={() => { setActiveTab('inventory'); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${themeClasses.menuItem(activeTab === 'inventory')}`}><Package className="w-5 h-5" />{(sidebarOpen || window.innerWidth < 1024) && <span>Inventori</span>}</button>
          </nav>
          <div className="pt-4 border-t border-neutral-900 space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-neutral-400">{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}{(sidebarOpen || window.innerWidth < 1024) && <span>Tema</span>}</button>
          </div>
        </div>
      </aside>

      {sidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-grow flex flex-col h-full overflow-hidden">
        <header className={`h-16 min-h-[4rem] flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-md ${themeClasses.header}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:text-lime-500 lg:hidden"><Menu className="w-5 h-5" /></button>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-neutral-500">{activeTab === 'product-pov' ? 'POV Tangan' : activeTab === 'product-mix' ? 'Produk Mix' : activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-2"><p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin Arkapro</p><p className="text-[10px] text-lime-500 font-black">PREMIUM ACCESS</p></div>
             <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden"><User className="w-5 h-5 text-neutral-400" /></div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10 pb-20">
          {activeTab === 'product-pov' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Variasi Visual</h2></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500">Foto Produk</label>
                      <div className="relative aspect-square rounded-2xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-neutral-900/30 group">
                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { setImage(r.result as string); setGeneratedImages([]); }; r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                        {image ? (
                          <>
                            <img src={image} className="w-full h-full object-contain p-2" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                          </>
                        ) : <Upload className="text-lime-500 w-6 h-6" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500">Latar</label>
                      <div className="relative aspect-square rounded-2xl border-2 border-dashed border-neutral-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-neutral-900/30 group">
                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setBackgroundImage(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                        {backgroundImage ? (
                          <>
                            <img src={backgroundImage} className="w-full h-full object-contain p-2" />
                            <button onClick={(e) => { e.stopPropagation(); setBackgroundImage(null); }} className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                          </>
                        ) : <Layout className="text-emerald-500 w-6 h-6" />}
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 sm:p-6 rounded-2xl border ${themeClasses.card} space-y-6`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-neutral-500">Jumlah Tangan</label><select value={handCount} onChange={e => setHandCount(e.target.value as any)} className={`w-full p-3 rounded-xl border ${themeClasses.input} text-sm`}><option value="1">1 Tangan</option><option value="2">2 Tangan</option></select></div>
                      <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-neutral-500">Lengan</label><select value={sleeveType} onChange={e => setSleeveType(e.target.value as any)} className={`w-full p-3 rounded-xl border ${themeClasses.input} text-sm`}><option value="long">Panjang</option><option value="short">Pendek</option></select></div>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1"><Frame className="w-3 h-3" /> Rasio Aspek</label>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {['1:1', '9:16', '16:9', '3:4'].map((ratio) => (
                             <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`p-2 rounded-xl border text-center transition-all ${aspectRatio === ratio ? 'bg-lime-500 border-lime-500 text-black' : themeClasses.input}`}>
                                <div className="text-[10px] font-black">{ratio === '3:4' ? '4:5' : ratio}</div>
                                <div className={`text-[8px] uppercase tracking-tighter ${aspectRatio === ratio ? 'text-black/60' : 'text-neutral-500'}`}>{ratio === '9:16' ? 'TikTok' : ratio === '16:9' ? 'Landscp' : ratio === '3:4' ? 'Portrt' : 'Square'}</div>
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2"><div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Prompt Kreatif</label><button onClick={handleAutoPromptPOV} className="text-[10px] text-lime-500 font-black">Auto Prompt</button></div><textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} className={`w-full h-24 p-4 rounded-xl border ${themeClasses.input} text-sm resize-none`} placeholder="Deskripsikan hasil yang diinginkan..." /></div>
                    
                    <button onClick={handleGenerateVariations} disabled={isLoading || !image} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${isLoading ? 'bg-neutral-800 text-neutral-500' : 'bg-lime-500 text-black shadow-lg shadow-lime-500/20 active:scale-95 transition-all'}`}>
                      {isLoading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-black" />}
                      {isLoading ? 'Processing...' : 'Buat 4 Variasi POV'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center gap-2"><Grid className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Hasil Studio Ultra HD</h2></div>
                   <div className={`w-full aspect-square sm:min-h-[500px] rounded-2xl border ${themeClasses.card} flex flex-col relative overflow-hidden bg-black/20`}>
                      {isLoading && <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white text-center"><RefreshCw className="w-10 h-10 animate-spin mb-4 text-lime-500" /><p className="font-black uppercase tracking-widest text-xs">{loadingStep}</p></div>}
                      {generatedImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 h-full content-start overflow-y-auto custom-scrollbar">
                          {generatedImages.map((img, idx) => (
                            <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-neutral-800 hover:border-lime-500 transition-all shadow-lg">
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                                   <button onClick={() => setSelectedImageIndex(idx)} className="p-2 sm:p-3 bg-white/20 text-white rounded-full hover:bg-lime-500 hover:text-black transition-all hover:scale-110"><Eye className="w-5 h-5" /></button>
                                   <a href={img} download={`pov-${idx}.png`} className="p-2 sm:p-3 bg-white/20 text-white rounded-full hover:bg-emerald-500 transition-all hover:scale-110"><Download className="w-5 h-5" /></a>
                                </div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="flex-grow flex items-center justify-center opacity-30 uppercase font-black tracking-widest text-center px-6 text-xs">Antrean Kosong.</div>}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'product-mix' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="flex items-center gap-2"><Layers className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Produk Mix Studio</h2></div>
                    <div className="grid grid-cols-4 gap-2">
                       {mixImages.map((img, idx) => (
                          <div key={idx} className="space-y-1">
                             <label className="text-[9px] uppercase font-black text-neutral-500 truncate">Produk {idx+1}</label>
                             <div className="relative aspect-square rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden cursor-pointer bg-neutral-900/50 group">
                                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { const n = [...mixImages]; n[idx] = r.result as string; setMixImages(n); }; r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                                {img ? (
                                  <>
                                    <img src={img} className="w-full h-full object-contain p-1" />
                                    <button onClick={(e) => { e.stopPropagation(); const n = [...mixImages]; n[idx] = null; setMixImages(n); }} className="absolute top-1 right-1 z-20 p-1 bg-red-500 text-white rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                  </>
                                ) : <Upload className="w-4 h-4 text-lime-500/50" />}
                             </div>
                          </div>
                       ))}
                       <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-neutral-500 truncate">Ref Wajah</label>
                          <div className="relative aspect-square rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden cursor-pointer bg-neutral-900/50 group">
                             <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setMixFaceReference(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                             {mixFaceReference ? (
                               <>
                                 <img src={mixFaceReference} className="w-full h-full object-cover" />
                                 <button onClick={(e) => { e.stopPropagation(); setMixFaceReference(null); }} className="absolute top-1 right-1 z-20 p-1 bg-red-500 text-white rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                               </>
                             ) : <Scan className="w-4 h-4 text-blue-500/50" />}
                          </div>
                       </div>
                    </div>

                    <div className={`p-4 sm:p-5 rounded-2xl border ${themeClasses.card} space-y-4 shadow-xl`}>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1"><Users className="w-3 h-3" /> Model Settings</label>
                             <div className="flex gap-1 flex-wrap">
                                <select value={mixGender} onChange={e => setMixGender(e.target.value)} className={`flex-grow p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Wanita">Wanita</option><option value="Pria">Pria</option></select>
                                <input type="number" value={mixAge} onChange={e => setMixAge(e.target.value)} className={`w-12 p-2 rounded-lg border text-xs ${themeClasses.input}`} placeholder="Usia" />
                                <select value={mixIsHijab ? "Hijab" : "Non-Hijab"} onChange={e => setMixIsHijab(e.target.value === "Hijab")} className={`flex-grow p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Non-Hijab">Non Hijab</option><option value="Hijab">Pakai Hijab</option></select>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1"><Camera className="w-3 h-3" /> Camera Settings</label>
                             <div className="flex gap-1">
                                <select value={mixAngle} onChange={e => setMixAngle(e.target.value)} className={`flex-grow p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Eye Level">Eye Level</option><option value="High Angle">High Angle</option><option value="Low Angle">Low Angle</option></select>
                                <select value={mixFraming} onChange={e => setMixFraming(e.target.value)} className={`flex-grow p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Setengah Badan">Setengah</option><option value="Seluruh Badan">Full Body</option></select>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1"><Frame className="w-3 h-3" /> Rasio Aspek</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {['1:1', '9:16', '16:9', '3:4'].map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`p-2 rounded-xl border text-center transition-all ${aspectRatio === ratio ? 'bg-lime-500 border-lime-500 text-black' : themeClasses.input}`}>
                                   <div className="text-[10px] font-black">{ratio === '3:4' ? '4:5' : ratio}</div>
                                   <div className={`text-[8px] uppercase tracking-tighter ${aspectRatio === ratio ? 'text-black/60' : 'text-neutral-500'}`}>{ratio === '9:16' ? 'TikTok' : ratio === '16:9' ? 'Landscp' : ratio === '3:4' ? 'Portrt' : 'Square'}</div>
                                </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-neutral-500 truncate">Latar Custom (Opsional)</label>
                          <div className="relative h-14 rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden cursor-pointer bg-neutral-900/50 group">
                             <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setMixBackground(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                             {mixBackground ? (
                                <div className="flex items-center gap-2 p-1">
                                   <img src={mixBackground} className="h-10 w-10 object-cover rounded-lg" />
                                   <span className="text-[10px] font-bold">Latar Terpasang</span>
                                   <button onClick={(e) => { e.stopPropagation(); setMixBackground(null); }} className="absolute top-2 right-2 z-20 p-1 bg-red-500 text-white rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                </div>
                             ) : <div className="flex items-center gap-2 text-[10px]"><ImageIcon className="w-4 h-4 text-emerald-500" /> Pilih Latar Kustom</div>}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Deskripsi Mix</label><button onClick={handleAutoPromptMix} className="text-[10px] text-lime-500 font-black hover:underline">Generate Prompt</button></div>
                          <textarea value={mixPrompt} onChange={e => setMixPrompt(e.target.value)} placeholder="Contoh: Model sedang memakai jaket dan jam tangan..." className={`w-full h-20 p-3 rounded-xl border text-xs ${themeClasses.input} resize-none`} />
                       </div>

                       <button onClick={handleGenerateMixVariations} disabled={isLoading || mixImages.filter(Boolean).length === 0} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-neutral-800 text-neutral-500' : 'bg-lime-500 text-black shadow-lg shadow-lime-500/20 active:scale-95'}`}>
                          {isLoading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4 fill-black" />}
                          {isLoading ? 'Processing Mix...' : 'Generate 4 Variasi Mix'}
                       </button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center gap-2"><Grid className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Hasil Mix Studio Ultra HD</h2></div>
                    <div className={`w-full aspect-square sm:min-h-[500px] rounded-2xl border ${themeClasses.card} relative flex flex-col shadow-inner overflow-hidden bg-black/20`}>
                        {isLoading && <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white text-center"><RefreshCw className="w-12 h-12 animate-spin mb-4 text-lime-500" /><p className="font-black text-xs tracking-widest uppercase">{loadingStep}</p></div>}
                        {generatedImages.length > 0 ? (
                           <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 h-full content-start overflow-y-auto custom-scrollbar">
                              {generatedImages.map((img, idx) => (
                                <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-neutral-800 hover:border-lime-500 transition-all shadow-lg">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                                       <button onClick={() => setSelectedImageIndex(idx)} className="p-2 sm:p-3 bg-white/20 text-white rounded-full hover:bg-lime-500 hover:text-black transition-all hover:scale-110"><Eye className="w-5 h-5" /></button>
                                       <a href={img} download={`mix-${idx}.png`} className="p-2 sm:p-3 bg-white/20 text-white rounded-full hover:bg-emerald-500 transition-all hover:scale-110"><Download className="w-5 h-5" /></a>
                                    </div>
                                </div>
                              ))}
                           </div>
                        ) : <div className="flex-grow flex flex-col items-center justify-center opacity-30 text-center px-6"><Layers className="w-16 h-16 mb-4 text-neutral-500" /><p className="font-black uppercase tracking-widest text-xs">Antrean Mix Kosong</p></div>}
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* SHARED TTS SECTION */}
          {(activeTab === 'product-pov' || activeTab === 'product-mix') && (
             <section className="max-w-6xl mx-auto mt-10 space-y-6 animate-in fade-in duration-700">
               <div className="flex items-center gap-2"><Mic className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Voice Over Affiliate</h2></div>
               <div className={`p-5 sm:p-8 rounded-2xl border ${themeClasses.card} shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10`}>
                 <div className="lg:col-span-2 space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2"><label className="text-[10px] uppercase font-black text-neutral-500">Angle / Tema</label><input type="text" value={productTheme} onChange={e => setProductTheme(e.target.value)} placeholder="Hemat, Mewah, Viral..." className={`w-full p-4 rounded-xl border ${themeClasses.input} text-sm`} /></div>
                     <div className="space-y-2"><label className="text-[10px] uppercase font-black text-neutral-500">Strategi CTA</label><select value={ctaType} onChange={e => setCtaType(e.target.value)} className={`w-full p-4 rounded-xl border ${themeClasses.input} text-sm`}>{CTA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}</select></div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"><label className="text-[10px] uppercase font-black text-neutral-500">Naskah Pintar (Maks 20s)</label><button onClick={handleGenerateScriptInternal} disabled={isScriptLoading} className="text-[10px] font-bold text-lime-500 flex items-center gap-1 bg-lime-500/10 px-3 py-1.5 rounded-full hover:bg-lime-500/20 transition-all">{isScriptLoading ? <RefreshCw className="animate-spin w-3 h-3" /> : <Mic className="w-3 h-3" />} Buat Naskah Otomatis</button></div>
                     <textarea value={ttsText} onChange={e => { setTtsText(e.target.value); audioBufferRef.current = null; }} placeholder="Naskah akan muncul di sini..." className={`w-full h-32 p-4 rounded-xl border text-sm resize-none ${themeClasses.input}`} />
                   </div>
                 </div>
                 <div className="flex flex-col space-y-6">
                   <div className="space-y-2"><label className="text-[10px] uppercase font-black text-neutral-500">Pilih Model Suara AI</label><select value={selectedVoice} onChange={e => { setSelectedVoice(e.target.value); audioBufferRef.current = null; }} className={`w-full p-4 rounded-xl border text-sm font-bold ${themeClasses.input}`}>{VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                   <div className="mt-auto space-y-4">
                     <button onClick={handlePlayTTS} disabled={isTtsLoading || !ttsText} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest ${isTtsLoading ? 'bg-neutral-800 text-neutral-600' : 'bg-white text-black hover:bg-neutral-200 shadow-lg active:scale-95'}`}>{isTtsLoading ? <RefreshCw className="animate-spin mx-auto w-5 h-5" /> : <><Volume2 className="inline mr-2 w-4 h-4" /> Sintesis Suara AI</>}</button>
                     {mp3Url && (
                       <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => isPlaying ? handleStopAudio() : handlePlayTTS()} className={`py-3 rounded-lg flex items-center justify-center gap-2 border ${isPlaying ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-lime-500/10 text-lime-500 border-lime-500/20'}`}>{isPlaying ? <Pause /> : <Play />}</button>
                         <a href={mp3Url} download="promo-voiceover.mp3" className="bg-lime-500 text-black rounded-lg flex items-center justify-center font-black text-[10px] uppercase shadow-lg shadow-lime-500/20 px-4 py-2"><Download className="w-4 h-4 mr-2" /> Unduh MP3</a>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </section>
          )}

          {activeTab === 'inventory' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-20">
               <Zap className="w-16 h-16 text-lime-500 animate-pulse" />
               <h2 className="text-xl font-bold">Modul Inventori Segera Hadir</h2>
            </div>
          )}
        </main>
        <footer className="py-6 px-6 sm:px-10 text-center border-t border-neutral-900 opacity-30 text-[10px] font-black tracking-widest uppercase mt-auto">© 2026 Arkanum AI Affiliate - Mesin Editor v2.5</footer>
      </div>
    </div>
  );
}
