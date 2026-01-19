
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Settings, Upload, Wand2, Download, Mic, Play, Pause, Hand, 
  Layers, Shirt, User, Zap, X, Image as ImageIcon, Volume2, 
  Sun, Moon, Grid, Eye, EyeOff, ChevronDown, Sparkles, ChevronLeft, 
  ChevronRight, Tag, Megaphone, Lock, UserCheck, Layout, RefreshCw, AlertCircle,
  Home, Package, BarChart3, LogOut, Menu, UserPlus, Camera, Users, Maximize2,
  Scan, ArrowLeft, Frame, Trash2, ToggleRight, ToggleLeft, ExternalLink,
  ShieldCheck, AlertTriangle, Cpu, Cloud, Undo2, Redo2, Save, Sparkle,
  Fingerprint, MousePointer2, PackageOpen, Briefcase, Pipette, MousePointer
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

const STORAGE_KEY = 'arkanum_affiliate_settings_v1';

const withRetry = async <T,>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 2000
): Promise<T> => {
  try { 
    return await fn(); 
  } catch (error: any) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
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
  const [activeTab, setActiveTab] = useState('product-pov');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.DARK);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  // POV State
  const [image, setImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [handCount, setHandCount] = useState<HandCount>('1');
  const [sleeveType, setSleeveType] = useState<SleeveType>('long');
  const [enableHands, setEnableHands] = useState(true);
  const [enableSleeves, setEnableSleeves] = useState(true);
  const [povSlotsEnabled, setPovSlotsEnabled] = useState(true);
  const [povSlots, setPovSlots] = useState<string[]>(['holding', 'opening', 'reviewing', 'using']);

  // Mix State
  const [mixImages, setMixImages] = useState<(string | null)[]>([null, null, null]);
  const [mixBackground, setMixBackground] = useState<string | null>(null);
  const [mixFaceReference, setMixFaceReference] = useState<string | null>(null);
  const [mixProductName, setMixProductName] = useState("");
  const [mixPrompt, setMixPrompt] = useState("");
  const [mixGender, setMixGender] = useState("Wanita");
  const [mixAge, setMixAge] = useState("25");
  const [mixAngle, setMixAngle] = useState("Eye Level");
  const [mixFraming, setMixFraming] = useState("Setengah Badan");
  const [mixIsHijab, setMixIsHijab] = useState(false);
  const [enableModel, setEnableModel] = useState(true);
  const [enableCamera, setEnableCamera] = useState(true);
  const [mixSlotsEnabled, setMixSlotsEnabled] = useState(true);
  const [mixSlots, setMixSlots] = useState<string[]>(['holding', 'opening', 'reviewing', 'using']);

  // TTS State
  const [ttsText, setTtsText] = useState("");
  const [productTheme, setProductTheme] = useState(""); 
  const [ctaType, setCtaType] = useState('soft');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isScriptLoading, setIsScriptLoading] = useState(false);

  // History & Ref
  const [history, setHistory] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const isInternalUpdate = useRef(false);
  const isFirstLoad = useRef(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isDark = themeMode === ThemeMode.DARK;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Tutup sidebar jika di mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const getSnapshot = useCallback(() => ({
    activeTab,
    aspectRatio,
    image,
    backgroundImage,
    imagePrompt,
    handCount,
    sleeveType,
    enableHands,
    enableSleeves,
    povSlotsEnabled,
    povSlots,
    mixImages: [...mixImages],
    mixBackground,
    mixFaceReference,
    mixProductName,
    mixPrompt,
    mixGender,
    mixAge,
    mixAngle,
    mixFraming,
    mixIsHijab,
    enableModel,
    enableCamera,
    mixSlotsEnabled,
    mixSlots,
    ttsText,
    productTheme,
    ctaType,
    selectedVoice
  }), [
    activeTab, aspectRatio, image, backgroundImage, imagePrompt, handCount,
    sleeveType, enableHands, enableSleeves, povSlotsEnabled, povSlots, mixImages, mixBackground,
    mixFaceReference, mixProductName, mixPrompt, mixGender, mixAge, mixAngle,
    mixFraming, mixIsHijab, enableModel, enableCamera, mixSlotsEnabled, mixSlots, ttsText, productTheme,
    ctaType, selectedVoice
  ]);

  const applySnapshot = useCallback((snapshot: any) => {
    isInternalUpdate.current = true;
    setActiveTab(snapshot.activeTab || 'product-pov');
    setAspectRatio(snapshot.aspectRatio || '1:1');
    setImage(snapshot.image || null);
    setBackgroundImage(snapshot.backgroundImage || null);
    setImagePrompt(snapshot.imagePrompt || "");
    setHandCount(snapshot.handCount || '1');
    setSleeveType(snapshot.sleeveType || 'long');
    setEnableHands(snapshot.enableHands !== undefined ? snapshot.enableHands : true);
    setEnableSleeves(snapshot.enableSleeves !== undefined ? snapshot.enableSleeves : true);
    setPovSlotsEnabled(snapshot.povSlotsEnabled !== undefined ? snapshot.povSlotsEnabled : true);
    setPovSlots(snapshot.povSlots || ['holding', 'opening', 'reviewing', 'using']);
    setMixImages(snapshot.mixImages || [null, null, null]);
    setMixBackground(snapshot.mixBackground || null);
    setMixFaceReference(snapshot.mixFaceReference || null);
    setMixProductName(snapshot.mixProductName || "");
    setMixPrompt(snapshot.mixPrompt || "");
    setMixGender(snapshot.mixGender || "Wanita");
    setMixAge(snapshot.age || snapshot.mixAge || "25");
    setMixAngle(snapshot.mixAngle || "Eye Level");
    setMixFraming(snapshot.mixFraming || "Setengah Badan");
    setMixIsHijab(snapshot.mixIsHijab !== undefined ? snapshot.mixIsHijab : false);
    setEnableModel(snapshot.enableModel !== undefined ? snapshot.enableModel : true);
    setEnableCamera(snapshot.enableCamera !== undefined ? snapshot.enableCamera : true);
    setMixSlotsEnabled(snapshot.mixSlotsEnabled !== undefined ? snapshot.mixSlotsEnabled : true);
    setMixSlots(snapshot.mixSlots || ['holding', 'opening', 'reviewing', 'using']);
    setTtsText(snapshot.ttsText || "");
    setProductTheme(snapshot.productTheme || "");
    setCtaType(snapshot.ctaType || 'soft');
    setSelectedVoice(snapshot.selectedVoice || VOICES[0].id);
    
    audioBufferRef.current = null;
    setAudioUrl(null);

    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 50);
  }, []);

  // Initial Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        applySnapshot(parsed);
      } catch (e) { console.error("Gagal memuat data tersimpan"); }
    }
    isFirstLoad.current = false;
  }, [applySnapshot]);

  // Persist to LocalStorage on Change
  useEffect(() => {
    if (isFirstLoad.current || isInternalUpdate.current) return;
    const current = getSnapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }, [getSnapshot]);

  const saveToHistory = useCallback(() => {
    if (isInternalUpdate.current) return;
    const currentSnapshot = getSnapshot();
    setHistory(prev => {
      if (prev.length > 0 && JSON.stringify(prev[prev.length - 1]) === JSON.stringify(currentSnapshot)) {
        return prev;
      }
      return [...prev.slice(-19), currentSnapshot];
    });
    setRedoStack([]);
  }, [getSnapshot]);

  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    setRedoStack(prev => [...prev, current]);
    setHistory(prev => prev.slice(0, -1));
    applySnapshot(previous);
  }, [history, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));
    applySnapshot(next);
  }, [redoStack, applySnapshot]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isInternalUpdate.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => { saveToHistory(); }, 500);
  }, [
    image, backgroundImage, imagePrompt, handCount, sleeveType,
    enableHands, enableSleeves, povSlotsEnabled, povSlots, mixImages, mixBackground, mixFaceReference,
    mixProductName, mixPrompt, mixGender, mixAge, mixAngle, mixFraming,
    mixIsHijab, enableModel, enableCamera, mixSlotsEnabled, mixSlots, ttsText, productTheme, ctaType,
    selectedVoice, aspectRatio
  ]);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 1024) setSidebarOpen(true); else setSidebarOpen(false); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setThemeMode(prev => prev === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK);

  const handleAutoPromptPOV = () => {
    const scenarioMap: Record<string, string> = {
      holding: "memegang produk dengan elegan",
      opening: "sedang membuka produk atau unboxing",
      reviewing: "menunjukkan detail tekstur produk secara close-up",
      pointing: "menunjuk fitur utama produk",
      using: "sedang menggunakan produk secara fungsional",
      dabbing: "mencolek sedikit tekstur produk",
      applying: "mengoleskan produk dengan merata",
      placing: "meletakkan produk di atas meja"
    };
    const interactionText = enableHands ? `POV ${handCount} tangan ${scenarioMap[povSlots[0]]} ${enableSleeves ? `dengan lengan ${sleeveType}` : "tanpa lengan"}` : "Still life";
    setImagePrompt(`Foto produk ultra HD, ${interactionText}, studio lighting.`);
  };

  const handleAutoPromptMix = () => {
    const hijabText = mixIsHijab ? "modern hijab," : "";
    const modelText = enableModel ? `model ${mixGender} ${hijabText} usia ${mixAge} tahun,` : `creative commercial layout,`;
    const camText = enableCamera ? `framing ${mixFraming} dan sudut ${mixAngle},` : "";
    setMixPrompt(`Professional commercial photography, ${modelText} ${camText} ultra HD lighting, high quality.`);
  };

  const handleGenerateVariations = async () => {
    if (!image) return alert("Unggah foto produk.");
    setIsLoading(true); setGeneratedImages([]);
    const sessionSeed = Math.floor(Math.random() * 1000000);
    try {
      const optimizedProduct = await resizeImage(image);
      let backgroundBase64 = backgroundImage ? await resizeImage(backgroundImage) : null;
      const currentResults: string[] = [];
      const scenarioPromptMap: Record<string, string> = {
        holding: "Hands holding the product elegantly for display",
        opening: "Hands interacting by opening the product or unboxing it",
        reviewing: "Hands pointing at the fine details and texture of the product",
        pointing: "A finger pointing at a specific feature of the product",
        using: "Hands using the product as intended in a daily lifestyle way",
        dabbing: "A close-up shot of a finger dabbing the product texture or cream",
        applying: "Hands applying or spreading the product smoothly on a surface",
        placing: "Hands carefully placing the product on a professional studio table surface"
      };

      for (let i = 0; i < 4; i++) {
        const slotMode = povSlotsEnabled ? povSlots[i] : povSlots[0];
        setLoadingStep(`Slot ${i + 1}/4: ${scenarioPromptMap[slotMode].split(' ')[0]}...`);
        const result = await withRetry(() => generateProductImage({
          base64Image: optimizedProduct, base64Background: backgroundBase64,
          prompt: imagePrompt || "Professional product", handCount, sleeveType,
          includeHands: enableHands, useSleeves: enableSleeves, aspectRatio,
          scenario: scenarioPromptMap[slotMode],
          seed: sessionSeed
        }));
        if (result) { currentResults.push(result); setGeneratedImages([...currentResults]); }
      }
    } catch (e) {
      console.error(e);
      alert("Gagal memproses gambar. Pastikan API Key valid.");
    } finally { setIsLoading(false); }
  };

  const handleGenerateMixVariations = async () => {
    const activeProducts = mixImages.filter(img => img !== null) as string[];
    if (activeProducts.length === 0) return alert("Unggah minimal 1 produk.");
    setIsLoading(true); setGeneratedImages([]);
    const sessionSeed = Math.floor(Math.random() * 1000000);
    try {
      const optimizedProducts = await Promise.all(activeProducts.map(img => resizeImage(img)));
      let backgroundBase64 = mixBackground ? await resizeImage(mixBackground) : null;
      let faceRefBase64 = mixFaceReference ? await resizeImage(mixFaceReference) : null;
      const currentResults: string[] = [];
      const scenarioPromptMap: Record<string, string> = {
        holding: "Model holding the products for display",
        opening: "Model opening the product package or unboxing",
        reviewing: "Close-up of model reviewing product quality and details",
        pointing: "Model pointing at the best features of the set",
        using: "Model wearing or using the products in context",
        dabbing: "Model dabbing the product to show the fine texture consistency",
        applying: "Model applying the product as part of a skincare or beauty routine",
        placing: "Model placing the complete product set on a stylized desk surface"
      };

      for (let i = 0; i < 4; i++) {
        const slotMode = mixSlotsEnabled ? mixSlots[i] : mixSlots[0];
        setLoadingStep(`Slot ${i + 1}/4: ${scenarioPromptMap[slotMode].split(' ')[0]}...`);
        const result = await withRetry(() => generateProductMixImage({
          productImages: optimizedProducts, backgroundImage: backgroundBase64, faceReference: faceRefBase64,
          prompt: mixPrompt || `Mix ${mixProductName}`, gender: mixGender, age: mixAge, angle: mixAngle,
          framing: mixFraming, isHijab: mixIsHijab, aspectRatio, useModel: enableModel, useCamera: enableCamera,
          scenario: scenarioPromptMap[slotMode],
          seed: sessionSeed
        }));
        if (result) { currentResults.push(result); setGeneratedImages([...currentResults]); }
      }
    } catch (e) {
      console.error(e);
      alert("Gagal memproses mix produk. Pastikan API Key valid.");
    } finally { setIsLoading(false); }
  };

  const handleGenerateScriptInternal = async () => {
    setIsScriptLoading(true);
    try {
      const script = activeTab === 'product-pov' 
        ? await withRetry(() => generateProductScript({ productDescription: imagePrompt || productTheme, theme: productTheme, ctaType, base64Image: image }))
        : await withRetry(() => generateMixScript({ productContext: mixPrompt || mixProductName, products: mixImages, ctaType }));
      setTtsText(script.replace(/["']/g, "").trim()); audioBufferRef.current = null;
    } catch (e) {
      console.error(e);
    } finally { setIsScriptLoading(false); }
  };

  const handlePlayTTS = async () => {
    if (!ttsText) return;
    if (audioBufferRef.current) { playLocalBuffer(); return; }
    setIsTtsLoading(true);
    try {
      const base64Audio = await withRetry(() => generateTTS(ttsText, selectedVoice));
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current; if (ctx.state === 'suspended') await ctx.resume();
        const pcmData = decodePCM(base64Audio);
        const buffer = await decodeAudioData(pcmData, ctx, 24000, 1);
        audioBufferRef.current = buffer; playLocalBuffer();
        const mp3Blob = encodeWav(pcmData, 24000); 
        setAudioUrl(URL.createObjectURL(mp3Blob));
      }
    } catch (e) { 
      console.error(e);
      alert("Gagal memproses suara."); 
    } finally { setIsTtsLoading(false); }
  };

  const playLocalBuffer = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    const ctx = audioContextRef.current; if (ctx.state === 'suspended') ctx.resume();
    if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
    const source = ctx.createBufferSource(); source.buffer = audioBufferRef.current;
    source.connect(ctx.destination); source.onended = () => setIsPlaying(false);
    source.start(0); sourceRef.current = source; setIsPlaying(true);
  };

  const handleStopAudio = () => { if (sourceRef.current) sourceRef.current.stop(); setIsPlaying(false); };

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

  const CustomSwitch = ({ enabled, onChange }: { enabled: boolean, onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!enabled)} className={`p-1 rounded-md transition-all ${enabled ? 'text-lime-500' : 'text-neutral-600'}`}>
      {enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
    </button>
  );

  const resetAll = () => {
    if (window.confirm("Apakah Anda ingin mereset semua pengaturan ke default?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const PROMPT_SUGGESTIONS = {
    pov: [
      { id: 'studio', label: 'Studio Pro', prompt: "Professional studio macro shot, sharp focus on product details, clean soft shadows, 8k resolution, minimalist commercial look." },
      { id: 'lifestyle', label: 'Lifestyle', prompt: "Aesthetic lifestyle product photography, natural morning sunlight, minimalist decor, soft neutral tones, high-end content creator style." },
      { id: 'luxury', label: 'Luxury', prompt: "Cinematic luxury commercial lighting, dramatic shadows, premium velvet texture backdrop, elegant composition, sharp 8k details." }
    ],
    mix: [
      { id: 'catalog', label: 'Katalog Pro', prompt: "High-end fashion catalog photography, cohesive color palette, modern minimalist studio, professional commercial lighting, sharp editorial look." },
      { id: 'urban', label: 'Urban OOTD', prompt: "Trendy urban OOTD catalog style, clean city street background, vibrant colors, sharp high-quality streetwear aesthetic." },
      { id: 'premium', label: 'Premium Set', prompt: "Premium luxury collection showcase, elegant flatlay composition, professional product studio lighting, velvet and silk textures, 8k." }
    ]
  };

  const POV_SCENARIOS = [
    { id: 'holding', label: 'Memegang', icon: <Hand className="w-4 h-4" /> },
    { id: 'opening', label: 'Membuka', icon: <PackageOpen className="w-4 h-4" /> },
    { id: 'reviewing', label: 'Detail Produk', icon: <Fingerprint className="w-4 h-4" /> },
    { id: 'pointing', label: 'Menunjuk', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'using', label: 'Menggunakan', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'dabbing', label: 'Mencolek', icon: <Pipette className="w-4 h-4" /> },
    { id: 'applying', label: 'Mengoleskan', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'placing', label: 'Meletakkan di Meja', icon: <MousePointer className="w-4 h-4" /> },
  ];

  const handleUpdateSlot = (idx: number, mode: string) => {
    const newSlots = [...povSlots];
    newSlots[idx] = mode;
    setPovSlots(newSlots);
  };

  const handleUpdateMixSlot = (idx: number, mode: string) => {
    const newSlots = [...mixSlots];
    newSlots[idx] = mode;
    setMixSlots(newSlots);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text} flex flex-col lg:flex-row`}>
      {selectedImageIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4">
          <div className="absolute top-6 right-6 flex gap-4 z-50">
             <a href={generatedImages[selectedImageIndex]} download={`studio-${selectedImageIndex}.png`} className="p-3 bg-lime-500 text-black rounded-full"><Download className="w-6 h-6" /></a>
             <button onClick={() => setSelectedImageIndex(null)} className="p-3 bg-white/10 text-white rounded-full"><X className="w-6 h-6" /></button>
          </div>
          <img src={generatedImages[selectedImageIndex]} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:relative z-[60] h-full transition-all duration-300 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} ${themeClasses.sidebar} overflow-hidden`}>
        <div className="h-full flex flex-col p-4 w-64 lg:w-full">
          <div className="flex flex-col mb-10 px-2 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center"><Zap className="text-black w-6 h-6 fill-black" /></div>
              {(sidebarOpen || window.innerWidth < 1024) && <h1 className="text-lg font-black tracking-tight">Arkanum <span className="text-lime-500">Affiliate</span></h1>}
            </div>
          </div>
          
          <nav className="flex-grow space-y-2">
            <button onClick={() => handleTabChange('product-pov')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${themeClasses.menuItem(activeTab === 'product-pov')}`}><Hand className="w-5 h-5" />{(sidebarOpen || window.innerWidth < 1024) && <span>POV Tangan</span>}</button>
            <button onClick={() => handleTabChange('product-mix')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${themeClasses.menuItem(activeTab === 'product-mix')}`}><Layers className="w-5 h-5" />{(sidebarOpen || window.innerWidth < 1024) && <span>Produk Mix</span>}</button>
          </nav>

          <div className="pt-4 border-t border-neutral-900 space-y-2">
            <button onClick={resetAll} className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-[10px] uppercase text-red-500 hover:bg-red-500/5">
              <RefreshCw className="w-4 h-4" />
              {(sidebarOpen || window.innerWidth < 1024) && <span>Reset Konfigurasi</span>}
            </button>
            
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-neutral-400 hover:bg-white/5">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {(sidebarOpen || window.innerWidth < 1024) && <span>Ganti Tema</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-grow flex flex-col h-full overflow-hidden">
        <header className={`h-16 flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-md ${themeClasses.header}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 lg:hidden"><Menu className="w-5 h-5" /></button>
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">{activeTab === 'product-pov' ? 'POV Tangan' : 'Produk Mix'}</h2>
            
            <div className="hidden sm:flex items-center gap-1 ml-4 border-l border-neutral-800 pl-4">
              <button onClick={handleUndo} disabled={history.length <= 1} title="Urungkan (Ctrl+Z)" className={`p-2 rounded-lg transition-all ${history.length <= 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}><Undo2 className="w-4 h-4" /></button>
              <button onClick={handleRedo} disabled={redoStack.length === 0} title="Ulangi (Ctrl+Y)" className={`p-2 rounded-lg transition-all ${redoStack.length === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}><Redo2 className="w-4 h-4" /></button>
              <div className="ml-2 px-2 py-1 bg-lime-500/10 rounded-md border border-lime-500/20 flex items-center gap-2">
                 <Save className="w-3 h-3 text-lime-500" />
                 <span className="text-[8px] font-black uppercase text-lime-500">Auto Saved</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center"><User className="w-5 h-5 text-neutral-400" /></div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-20">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {activeTab === 'product-pov' ? (
                  <>
                    <div className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Variasi Visual</h2></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-neutral-500">Foto Produk</label>
                        <div className="relative aspect-square rounded-2xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden bg-neutral-900/30">
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                          {image ? <img src={image} className="w-full h-full object-contain p-2" /> : <Upload className="text-lime-500 w-6 h-6" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-neutral-500">Latar</label>
                        <div className="relative aspect-square rounded-2xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden bg-neutral-900/30">
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setBackgroundImage(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                          {backgroundImage ? <img src={backgroundImage} className="w-full h-full object-contain p-2" /> : <Layout className="text-emerald-500 w-6 h-6" />}
                        </div>
                      </div>
                    </div>
                    <div className={`p-6 rounded-2xl border ${themeClasses.card} space-y-6`}>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Tangan</label><CustomSwitch enabled={enableHands} onChange={setEnableHands} /></div>
                          <select disabled={!enableHands} value={handCount} onChange={e => setHandCount(e.target.value as any)} className={`w-full p-3 rounded-xl border ${themeClasses.input} text-sm disabled:opacity-30`}><option value="1">1 Tangan</option><option value="2">2 Tangan</option></select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Lengan</label><CustomSwitch enabled={enableSleeves} onChange={setEnableSleeves} /></div>
                          <select disabled={!enableSleeves} value={sleeveType} onChange={e => setSleeveType(e.target.value as any)} className={`w-full p-3 rounded-xl border ${themeClasses.input} text-sm disabled:opacity-30`}><option value="long">Panjang</option><option value="short">Pendek</option></select>
                        </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-neutral-500">Konfigurasi 4 Slot Gambar</label>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] font-black text-neutral-500 uppercase">{povSlotsEnabled ? 'Aktif' : 'Non-Aktif'}</span>
                               <CustomSwitch enabled={povSlotsEnabled} onChange={setPovSlotsEnabled} />
                            </div>
                         </div>
                         <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${povSlotsEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                            {povSlots.map((slotMode, idx) => (
                               <div key={idx} className={`p-3 rounded-xl border ${themeClasses.input} space-y-2`}>
                                  <div className="flex justify-between items-center">
                                     <span className="text-[9px] font-black text-neutral-500 uppercase">Gambar {idx + 1}</span>
                                     <Sparkles className="w-3 h-3 text-lime-500" />
                                  </div>
                                  <select 
                                    value={slotMode} 
                                    onChange={(e) => handleUpdateSlot(idx, e.target.value)}
                                    className="w-full bg-transparent text-[10px] font-bold uppercase outline-none focus:text-lime-500"
                                  >
                                     {POV_SCENARIOS.map(sc => (
                                        <option key={sc.id} value={sc.id} className="bg-neutral-900 text-white">{sc.label}</option>
                                     ))}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-neutral-500">Rasio Aspek</label>
                         <div className="grid grid-cols-4 gap-2">
                            {['1:1', '9:16', '16:9', '3:4'].map((ratio) => (
                               <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`p-2 rounded-xl border text-[10px] font-black ${aspectRatio === ratio ? 'bg-lime-500 text-black' : themeClasses.input}`}>{ratio}</button>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Deskripsi Projek</label><button onClick={handleAutoPromptPOV} className="text-[10px] text-lime-500 font-black hover:underline">Auto Prompt</button></div>
                        <div className="flex flex-wrap gap-2">
                           {PROMPT_SUGGESTIONS.pov.map(s => (
                              <button key={s.id} onClick={() => setImagePrompt(s.prompt)} className="px-3 py-1.5 rounded-full border border-neutral-800 text-[9px] font-bold uppercase tracking-wider hover:border-lime-500 hover:text-lime-500 transition-all bg-neutral-900/30">
                                 {s.label}
                              </button>
                           ))}
                        </div>
                        <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} className={`w-full h-20 p-4 rounded-xl border ${themeClasses.input} text-sm`} placeholder="Contoh: Pegang produk ini dengan gaya estetik..." />
                      </div>
                      <button onClick={handleGenerateVariations} disabled={isLoading || !image} className="w-full py-4 rounded-xl font-black uppercase text-sm bg-lime-500 text-black shadow-lg">Buat 4 Variasi POV</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2"><Layers className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Mix Produk</h2></div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-neutral-500">Nama Projek Mix</label>
                      <input type="text" value={mixProductName} onChange={e => setMixProductName(e.target.value)} placeholder="Contoh: Set OOTD Hijab Modern..." className={`w-full p-4 rounded-xl border ${themeClasses.input} text-sm`} />
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                      {mixImages.map((img, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-[9px] uppercase font-black text-neutral-500 text-center">Produk {idx + 1}</p>
                          <div className="relative aspect-square rounded-xl border-2 border-dashed border-neutral-800 flex items-center justify-center overflow-hidden bg-neutral-900/50">
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { const n = [...mixImages]; n[idx] = r.result as string; setMixImages(n); }; r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                            {img ? <img src={img} className="w-full h-full object-contain p-1" /> : <Upload className="w-4 h-4 text-lime-500" />}
                          </div>
                        </div>
                      ))}
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-emerald-500 text-center">Latar Belakang</p>
                        <div className="relative aspect-square rounded-xl border-2 border-dashed border-emerald-900 flex items-center justify-center overflow-hidden bg-emerald-950/20">
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setMixBackground(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                          {mixBackground ? <img src={mixBackground} className="w-full h-full object-contain p-1" /> : <Layout className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-blue-500 text-center">Referensi Wajah</p>
                        <div className="relative aspect-square rounded-xl border-2 border-dashed border-blue-900 flex items-center justify-center overflow-hidden bg-blue-950/20">
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setMixFaceReference(r.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 z-10" />
                          {mixFaceReference ? <img src={mixFaceReference} className="w-full h-full object-contain p-1" /> : <UserPlus className="w-4 h-4 text-blue-500" />}
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${themeClasses.card} space-y-5 shadow-2xl`}>
                      <div className={`space-y-3 p-3 rounded-xl transition-all duration-500 ${enableModel ? 'bg-black/40 border-lime-500/20 ring-1 ring-lime-500/10' : 'bg-black/10 border-neutral-900 opacity-60 grayscale'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <Users className={`w-4 h-4 ${enableModel ? 'text-lime-500' : 'text-neutral-600'}`} />
                             <label className={`text-[10px] uppercase font-black ${enableModel ? 'text-neutral-200' : 'text-neutral-600'}`}>Pengaturan Model</label>
                          </div>
                          <CustomSwitch enabled={enableModel} onChange={setEnableModel} />
                        </div>
                        
                        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-all ${enableModel ? 'opacity-100' : 'pointer-events-none'}`}>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase">Gender</span>
                            <select value={mixGender} onChange={e => setMixGender(e.target.value)} className={`w-full p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Wanita">Wanita</option><option value="Pria">Pria</option></select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase">Usia</span>
                            <input type="number" value={mixAge} onChange={e => setMixAge(e.target.value)} className={`w-full p-2 rounded-lg border text-xs ${themeClasses.input}`} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase">Gaya</span>
                            <select value={mixIsHijab ? "Ya" : "Tidak"} onChange={e => setMixIsHijab(e.target.value === "Ya")} className={`w-full p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Tidak">Non-Hijab</option><option value="Ya">Hijab</option></select>
                          </div>
                        </div>
                      </div>

                      <div className={`space-y-3 p-3 rounded-xl transition-all duration-500 ${enableCamera ? 'bg-black/40 border-emerald-500/20 ring-1 ring-emerald-500/10' : 'bg-black/10 border-neutral-900 opacity-60 grayscale'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <Camera className={`w-4 h-4 ${enableCamera ? 'text-emerald-500' : 'text-neutral-600'}`} />
                             <label className={`text-[10px] uppercase font-black ${enableCamera ? 'text-neutral-200' : 'text-neutral-600'}`}>Pengaturan Kamera</label>
                          </div>
                          <CustomSwitch enabled={enableCamera} onChange={setEnableCamera} />
                        </div>
                        
                        <div className={`grid grid-cols-2 gap-2 transition-all ${enableCamera ? 'opacity-100' : 'pointer-events-none'}`}>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase">Sudut Pandang</span>
                            <select value={mixAngle} onChange={e => setMixAngle(e.target.value)} className={`w-full p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Eye Level">Eye Level</option><option value="High Angle">High Angle</option><option value="Low Angle">Low Angle</option></select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase">Framing</span>
                            <select value={mixFraming} onChange={e => setMixFraming(e.target.value)} className={`w-full p-2 rounded-lg border text-xs ${themeClasses.input}`}><option value="Setengah Badan">Setengah Badan</option><option value="Seluruh Badan">Seluruh Badan</option></select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-neutral-500">Konfigurasi 4 Slot Mix</label>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] font-black text-neutral-500 uppercase">{mixSlotsEnabled ? 'Aktif' : 'Non-Aktif'}</span>
                               <CustomSwitch enabled={mixSlotsEnabled} onChange={setMixSlotsEnabled} />
                            </div>
                         </div>
                         <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${mixSlotsEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                            {mixSlots.map((slotMode, idx) => (
                               <div key={idx} className={`p-3 rounded-xl border ${themeClasses.input} space-y-2`}>
                                  <div className="flex justify-between items-center">
                                     <span className="text-[9px] font-black text-neutral-500 uppercase">Gambar {idx + 1}</span>
                                     <Sparkles className="w-3 h-3 text-lime-500" />
                                  </div>
                                  <select 
                                    value={slotMode} 
                                    onChange={(e) => handleUpdateMixSlot(idx, e.target.value)}
                                    className="w-full bg-transparent text-[10px] font-bold uppercase outline-none focus:text-lime-500"
                                  >
                                     {POV_SCENARIOS.map(sc => (
                                        <option key={sc.id} value={sc.id} className="bg-neutral-900 text-white">{sc.label}</option>
                                     ))}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] uppercase font-bold text-neutral-500">Rasio Aspek</label>
                         <div className="grid grid-cols-4 gap-2">
                            {['1:1', '9:16', '16:9', '3:4'].map((ratio) => (
                               <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`p-2 rounded-xl border text-[10px] font-black ${aspectRatio === ratio ? 'bg-lime-500 text-black' : themeClasses.input}`}>{ratio}</button>
                            ))}
                         </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-bold text-neutral-500">Deskripsi Projek</label><button onClick={handleAutoPromptMix} className="text-[10px] text-lime-500 font-black hover:underline">Auto Prompt</button></div>
                        <div className="flex flex-wrap gap-2">
                           {PROMPT_SUGGESTIONS.mix.map(s => (
                              <button key={s.id} onClick={() => setMixPrompt(s.prompt)} className="px-3 py-1.5 rounded-full border border-neutral-800 text-[9px] font-bold uppercase tracking-wider hover:border-lime-500 hover:text-lime-500 transition-all bg-neutral-900/30">
                                 {s.label}
                              </button>
                           ))}
                        </div>
                        <textarea value={mixPrompt} onChange={e => setMixPrompt(e.target.value)} placeholder="Contoh: Mix style OOTD untuk hijabers..." className={`w-full h-20 p-3 rounded-xl border text-xs ${themeClasses.input} resize-none`} />
                      </div>
                      <button onClick={handleGenerateMixVariations} disabled={isLoading || mixImages.filter(Boolean).length === 0} className="w-full py-4 rounded-xl font-black uppercase text-xs bg-lime-500 text-black shadow-lg hover:brightness-110 active:scale-95 transition-all">Generate 4 Variasi Mix</button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-2"><Grid className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Hasil Studio</h2></div>
                 <div className={`w-full aspect-square rounded-2xl border ${themeClasses.card} flex flex-col relative overflow-hidden bg-black/20`}>
                    {isLoading && <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white text-center"><RefreshCw className="w-10 h-10 animate-spin mb-4 text-lime-500" /><p className="font-black uppercase tracking-widest text-xs">{loadingStep}</p></div>}
                    {generatedImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 p-3 h-full overflow-y-auto custom-scrollbar">
                        {generatedImages.map((img, idx) => (
                          <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-neutral-800 hover:border-lime-500 transition-all">
                              <img src={img} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
                                 <button onClick={() => setSelectedImageIndex(idx)} className="p-2 bg-white/20 rounded-full"><Eye className="w-5 h-5" /></button>
                                 <a href={img} download={`studio-${idx}.png`} className="p-2 bg-white/20 rounded-full"><Download className="w-5 h-5" /></a>
                              </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="flex-grow flex items-center justify-center opacity-30 uppercase font-black tracking-widest text-xs">Antrean Kosong</div>}
                 </div>
              </div>
            </div>

            <section className="space-y-6">
              <div className="flex items-center gap-2"><Mic className="w-5 h-5 text-lime-500" /><h2 className="text-lg font-bold">Voice Over Affiliate</h2></div>
              <div className={`p-8 rounded-2xl border ${themeClasses.card} grid grid-cols-1 lg:grid-cols-3 gap-10`}>
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] uppercase font-black text-neutral-500">Tema</label><input type="text" value={productTheme} onChange={e => setProductTheme(e.target.value)} placeholder="Viral..." className={`w-full p-4 rounded-xl border ${themeClasses.input} text-sm`} /></div>
                    <div className="space-y-2"><label className="text-[10px] uppercase font-black text-neutral-500">CTA</label><select value={ctaType} onChange={e => setCtaType(e.target.value)} className={`w-full p-4 rounded-xl border ${themeClasses.input} text-sm`}>{CTA_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}</select></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[10px] uppercase font-black text-neutral-500">Naskah</label><button onClick={handleGenerateScriptInternal} disabled={isScriptLoading} className="text-[10px] font-bold text-lime-500">{isScriptLoading ? 'Loading...' : 'Buat Naskah'}</button></div>
                    <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} className={`w-full h-32 p-4 rounded-xl border text-sm resize-none ${themeClasses.input}`} />
                  </div>
                </div>
                <div className="flex flex-col justify-end space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-neutral-500">Model Suara</label>
                    <select value={selectedVoice} onChange={e => { setSelectedVoice(e.target.value); audioBufferRef.current = null; }} className={`w-full p-4 rounded-xl border text-sm font-bold ${themeClasses.input}`}>
                      {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <button onClick={handlePlayTTS} disabled={isTtsLoading || !ttsText} className="w-full py-4 rounded-xl font-black text-xs uppercase bg-white text-black">
                    {isTtsLoading ? 'Sintesis...' : 'Sintesis Suara AI'}
                  </button>
                  {audioUrl && (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => isPlaying ? handleStopAudio() : handlePlayTTS()} className="py-3 rounded-lg border border-lime-500/20 text-lime-500">{isPlaying ? <Pause className="mx-auto" /> : <Play className="mx-auto" />}</button>
                      <a href={audioUrl} download="arkanum-voiceover.mp3" className="bg-lime-500 text-black rounded-lg flex items-center justify-center font-black text-[10px] uppercase shadow-lg">
                        <Download className="w-4 h-4 mr-2" /> Simpan MP3
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
        <footer className="py-6 text-center border-t border-neutral-900 opacity-30 text-[10px] font-black uppercase tracking-widest">© 2026 Arkanum Affiliate</footer>
      </div>
    </div>
  );
}
