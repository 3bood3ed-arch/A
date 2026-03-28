/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Mic, Send, Play, Pause, Download, Share2, Palette, RefreshCw, Sparkles, Volume2, Heart, Users, PartyPopper, Check, History, Trash2, Info, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast, Toaster } from 'sonner';
import { generateShilatLyrics, generateShilatLyricsStream, generateShilatAudio, generateVoicePreview, generateShilatPreviewImage, generateAISuggestions, VOICE_OPTIONS, VoiceOption, DELIVERY_STYLES, DeliveryStyle, LANGUAGE_OPTIONS, LanguageOption } from './services/gemini';
import { cn } from './lib/utils';

const OCCASIONS = [
  { id: 'زواج', name: 'زواج', icon: Heart, description: 'أفراح ومناسبات سعيدة' },
  { id: 'أمسية', name: 'أمسية', icon: Music, description: 'أمسيات شعرية وجلسات طرب' },
  { id: 'محاورة', name: 'محاورة', icon: Users, description: 'رديات ومحاورات شعرية' },
  { id: 'قصائد', name: 'قصائد', icon: Sparkles, description: 'قصائد جزلة ومنوعة' },
  { id: 'ترحيب', name: 'ترحيب', icon: Users, description: 'استقبال الضيوف والترحيب' },
  { id: 'مدح', name: 'مدح', icon: Sparkles, description: 'ثناء وفخر واعتزاز' },
  { id: 'حفلة تخرج', name: 'تخرج', icon: PartyPopper, description: 'نجاح وإنجازات' },
];

const THEMES = [
  { id: 'amber', name: 'عنبري كلاسيك', bg: '#0c0a09', accent: '#78350f', secondary: '#451a03', gradient: '#292524', color: 'amber' },
  { id: 'blue', name: 'أزرق ملكي', bg: '#020617', accent: '#1e3a8a', secondary: '#172554', gradient: '#1e1b4b', color: 'blue' },
  { id: 'green', name: 'أخضر زمردي', bg: '#022c22', accent: '#064e3b', secondary: '#065f46', gradient: '#134e4a', color: 'emerald' },
  { id: 'purple', name: 'أرجواني ليلي', bg: '#0f172a', accent: '#3b0764', secondary: '#4c1d95', gradient: '#1e1b4b', color: 'purple' },
  { id: 'silver', name: 'فضي لامع', bg: '#1e293b', accent: '#a1a1aa', secondary: '#4b5563', gradient: '#0f172a', color: 'slate' },
  { id: 'custom', name: 'مخصص', bg: '#0c0a09', accent: '#78350f', secondary: '#451a03', gradient: '#292524', color: 'amber' },
];

const SUGGESTIONS: Record<string, string[]> = {
  'زواج': ["مدح العريس", "تهنئة للعروس", "فرحة الأهل", "زفة ملكية", "قصيدة في أم العريس"],
  'أمسية': ["قصيدة وجدانية", "وصف الطبيعة", "حنين للماضي", "غزل عفيف", "حكمة وتجارب"],
  'محاورة': ["ردية حماسية", "نقاش شعري", "تحدي القوافي", "لغز شعري", "محاورة فخر"],
  'قصائد': ["قصيدة وطنية", "رثاء", "نصيحة", "وصف الصيد", "قصيدة في الخيل"],
  'ترحيب': ["ترحيب بالضيوف", "قهوة وهيل", "مجلس الكرم", "حياكم الله", "يا هلا ومسهلا"],
  'مدح': ["فخر بالقبيلة", "مدح الخوي", "شجاعة وكرم", "عز وفخر", "قصيدة في الأب"],
  'حفلة تخرج': ["فرحة النجاح", "شكر للوالدين", "طموح المستقبل", "وداع الزملاء", "إنجاز وتفوق"],
};

interface ShilaHistory {
  id: string;
  topic: string;
  occasion: string;
  lyrics: string;
  audioUrl: string;
  voice: string;
  style: string;
  date: string;
}

interface PerformanceMetrics {
  lyricsLatency: number | null;
  audioLatency: number | null;
  imageLatency: number | null;
  totalErrors: number;
  lastError: string | null;
  bufferingEvents: number;
}

const Visualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className="flex items-end gap-1 h-12">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isPlaying ? [10, 40, 15, 48, 20, 35, 10] : 4,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
          className="w-1.5 bg-amber-500 rounded-full opacity-60"
        />
      ))}
    </div>
  );
};

export default function App() {
  const [topic, setTopic] = useState('');
  const [occasion, setOccasion] = useState('زواج');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('Fenrir');
  const [selectedStyle, setSelectedStyle] = useState<DeliveryStyle>('enthusiastic');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [pitch, setPitch] = useState<number>(1); // 0.5 to 2
  const [modulation, setModulation] = useState<number>(1); // 0 to 2
  const [lyrics, setLyrics] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [preservePitch, setPreservePitch] = useState(true);
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [effectVolume, setEffectVolume] = useState(0.3);
  const [mainVolume, setMainVolume] = useState(1.0);
  const [previewingVoice, setPreviewingVoice] = useState<VoiceOption | null>(null);
  const [previewingStyle, setPreviewingStyle] = useState<DeliveryStyle | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [customTheme, setCustomTheme] = useState({ bg: '#0c0a09', accent: '#78350f', secondary: '#451a03', gradient: '#292524' });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showCustomThemeEditor, setShowCustomThemeEditor] = useState(false);
  const [history, setHistory] = useState<ShilaHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('saudi');
  const [isDevMode, setIsDevMode] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [customPreviewText, setCustomPreviewText] = useState('');
  const [selectedVoice2, setSelectedVoice2] = useState<VoiceOption>(VOICE_OPTIONS[1]?.id || 'Zephyr');
  const [selectedStyle2, setSelectedStyle2] = useState<DeliveryStyle>('calm');

  const handleTestVoice = async (text: string) => {
    if (!text.trim()) return;
    setIsPreviewLoading(true);
    try {
      const audioUrl = await generateVoicePreview(selectedVoice, selectedStyle, text, selectedLanguage);
      if (audioUrl) {
        if (previewAudioRef.current) {
          previewAudioRef.current.src = audioUrl;
          previewAudioRef.current.play();
        }
      }
    } catch (error) {
      toast.error("فشل في تجربة الصوت");
    } finally {
      setIsPreviewLoading(false);
    }
  };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lyricsLatency: null,
    audioLatency: null,
    imageLatency: null,
    totalErrors: 0,
    lastError: null,
    bufferingEvents: 0,
  });
  const [simLatency, setSimLatency] = useState(0);
  const [simPacketLoss, setSimPacketLoss] = useState(0);
  const [bandwidth, setBandwidth] = useState(100); // Default to Wi-Fi speed
  const [isBuffering, setIsBuffering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const filteredHistory = history.filter(item => 
    item.topic.toLowerCase().includes(historySearch.toLowerCase()) || 
    item.occasion.toLowerCase().includes(historySearch.toLowerCase())
  );

  const filteredSuggestions = [...(SUGGESTIONS[occasion] || []), ...aiSuggestions].filter(s => 
    s.toLowerCase().includes(topic.toLowerCase())
  );

  const handleFetchAISuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generateAISuggestions(occasion, selectedLanguage);
      if (suggestions.length > 0) {
        setAiSuggestions(suggestions);
        toast.success('تم تحديث الاقتراحات بذكاء اصطناعي!');
      }
    } catch (error) {
      console.error("Failed to fetch AI suggestions:", error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
    setAiSuggestions([]); // Reset AI suggestions when occasion or language changes
  }, [occasion, selectedLanguage]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('shilat_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    const savedCustomTheme = localStorage.getItem('custom_theme');
    if (savedCustomTheme) {
      setCustomTheme(JSON.parse(savedCustomTheme));
    }
  }, []);

  const saveToHistory = (newShila: ShilaHistory) => {
    const updatedHistory = [newShila, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('shilat_history', JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('shilat_history', JSON.stringify(updatedHistory));
    toast.success('تم حذف الشيلة من السجل');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('shilat_history');
    toast.success('تم مسح السجل بنجاح');
  };

  useEffect(() => {
    const themeToApply = currentTheme.id === 'custom' ? customTheme : currentTheme;
    document.documentElement.style.setProperty('--bg-color', themeToApply.bg);
    document.documentElement.style.setProperty('--accent-color', themeToApply.accent);
    document.documentElement.style.setProperty('--secondary-color', themeToApply.secondary);
    document.documentElement.style.setProperty('--gradient-start', themeToApply.gradient);
  }, [currentTheme, customTheme]);

  const EFFECTS = [
    { id: 'none', name: 'بدون مؤثرات', url: '' },
    { id: 'applause', name: 'تصفيق وحماس', url: 'https://actions.google.com/sounds/v1/crowds/cheering_and_clapping.ogg' },
    { id: 'crowd', name: 'أجواء احتفالية', url: 'https://actions.google.com/sounds/v1/crowds/crowd_cheer.ogg' },
    { id: 'drums', name: 'إيقاع احتفالي', url: 'https://actions.google.com/sounds/v1/percussion/drum_roll.ogg' },
    { id: 'horse', name: 'صهيل وخيل', url: 'https://actions.google.com/sounds/v1/animals/horse_gallop.ogg' },
    { id: 'wind', name: 'رياح الصحراء', url: 'https://actions.google.com/sounds/v1/weather/wind_howling.ogg' },
    { id: 'nature', name: 'أجواء برية', url: 'https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg' },
    { id: 'fire', name: 'شبّة نار', url: 'https://actions.google.com/sounds/v1/foley/fire_crackling.ogg' },
  ];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = mainVolume;
    }
  }, [mainVolume]);

  // Network Simulation for Playback
  useEffect(() => {
    let bufferInterval: NodeJS.Timeout;
    if (isPlaying && isDevMode && simPacketLoss > 0) {
      bufferInterval = setInterval(() => {
        if (Math.random() * 100 < simPacketLoss) {
          setIsBuffering(true);
          setMetrics(prev => ({ ...prev, bufferingEvents: prev.bufferingEvents + 1 }));
          audioRef.current?.pause();
          setTimeout(() => {
            setIsBuffering(false);
            if (isPlaying) audioRef.current?.play().catch(console.error);
          }, 1000 + Math.random() * 2000);
        }
      }, 3000);
    }
    return () => clearInterval(bufferInterval);
  }, [isPlaying, isDevMode, simPacketLoss]);

  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.volume = effectVolume;
    }
  }, [effectVolume]);

  const handlePreview = async (voice: VoiceOption, style: DeliveryStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isCurrentlyPreviewing = previewingVoice === voice && previewingStyle === style;

    if (isCurrentlyPreviewing) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewingVoice(null);
        setPreviewingStyle(null);
      }
      return;
    }

    // Stop existing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    setIsPreviewLoading(true);
    setPreviewingVoice(voice);
    setPreviewingStyle(style);

    try {
      // Take first two lines of lyrics if available for a more realistic preview
      const lyricsSnippet = lyrics 
        ? lyrics.split('\n').filter(l => l.trim()).slice(0, 2).join('\n')
        : undefined;

      const url = await generateVoicePreview(voice, style, lyricsSnippet, selectedLanguage);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play();
      }
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewingVoice(null);
      setPreviewingStyle(null);
      toast.error('فشل توليد المعاينة');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyLyrics = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ الكلمات إلى الحافظة');
    } catch (err) {
      console.error('Failed to copy lyrics:', err);
      toast.error('فشل نسخ الكلمات');
    }
  };

  const handleDownloadLyrics = (text: string, title: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'lyrics'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('تم تحميل ملف الكلمات');
  };

  const handleDownloadAudio = (base64Data: string | null, filename: string, format: 'mp3' | 'wav' | 'flac' = 'mp3') => {
    if (!base64Data) {
      toast.error('لا يوجد ملف صوتي للتحميل');
      return;
    }
    try {
      const base64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = format === 'wav' ? 'audio/wav' : format === 'flac' ? 'audio/flac' : 'audio/mpeg';
      const blob = new Blob([byteArray], { type: mimeType });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename.split('.')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`بدأ تحميل الشيلة بصيغة ${format.toUpperCase()} بنجاح`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل تحميل الملف الصوتي');
    }
  };

  const handleGeneratePreview = async () => {
    if (!topic) return;
    setIsGeneratingPreview(true);
    const startTime = Date.now();
    try {
      const url = await generateShilatPreviewImage(topic, occasion, selectedLanguage);
      if (url) {
        setPreviewImageUrl(url);
        setMetrics(prev => ({ ...prev, imageLatency: Date.now() - startTime }));
        toast.success('تم إنشاء صورة العرض بنجاح!');
      }
    } catch (error: any) {
      console.error("Error generating preview image:", error);
      setMetrics(prev => ({ 
        ...prev, 
        totalErrors: prev.totalErrors + 1, 
        lastError: error.message || 'Image Generation Error' 
      }));
      toast.error('فشل إنشاء صورة العرض');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleShare = async () => {
    if (!audioUrl) return;
    
    const shareData: ShareData = {
      title: 'شيلتي الاحتفالية',
      text: `استمع إلى شيلتي: ${topic} بمناسبة ${occasion}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('تمت المشاركة بنجاح');
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('تم نسخ الرابط إلى الحافظة!');
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast.error('فشل نسخ الرابط');
      }
    }
  };

  const shareToPlatform = (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const text = encodeURIComponent(`استمع إلى شيلتي: ${topic} بمناسبة ${occasion}\n${window.location.href}`);
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      whatsapp: `https://api.whatsapp.com/send?text=${text}`,
      telegram: `https://t.me/share/url?url=${window.location.href}&text=${text}`,
    };
    window.open(urls[platform], '_blank');
  };

  const handleGenerateLyrics = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      toast.error('يرجى كتابة موضوع للقصيدة أولاً');
      return;
    }
    if (trimmedTopic.length < 3) {
      toast.error('موضوع القصيدة قصير جداً، يرجى كتابة وصف أكثر تفصيلاً');
      return;
    }

    setIsGeneratingLyrics(true);
    setAudioUrl(null);
    setPreviewImageUrl(null);
    setPlaybackRate(1); 
    setLyrics(''); // Clear previous lyrics
    const startTime = Date.now();
    try {
      const stream = generateShilatLyricsStream(trimmedTopic, occasion, selectedLanguage, length);
      let fullLyrics = '';
      for await (const chunk of stream) {
        fullLyrics += chunk;
        setLyrics(fullLyrics);
      }
      
      if (!fullLyrics) throw new Error("لم يتم استلام كلمات من النموذج");
      setMetrics(prev => ({ ...prev, lyricsLatency: Date.now() - startTime }));
      toast.success('تمت صياغة القصيدة بنجاح!');
    } catch (error: any) {
      console.error("Error generating lyrics:", error);
      setMetrics(prev => ({ 
        ...prev, 
        totalErrors: prev.totalErrors + 1, 
        lastError: error.message || 'Lyrics Generation Error' 
      }));
      toast.error(error.message || 'فشل إنشاء الكلمات، يرجى المحاولة مرة أخرى');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!lyrics) {
      toast.error('يرجى إنشاء القصيدة أولاً قبل توليد الصوت');
      return;
    }
    setIsGeneratingAudio(true);
    const startTime = Date.now();
    try {
      const url = await generateShilatAudio(lyrics, selectedVoice, selectedStyle, selectedLanguage, pitch, modulation);
      if (!url) throw new Error("لم يتم استلام رابط صوتي من النموذج");
      setAudioUrl(url);
      setMetrics(prev => ({ ...prev, audioLatency: Date.now() - startTime }));
      toast.success('تم توليد الشيلة بنجاح!');
      
      saveToHistory({
        id: Date.now().toString(),
        topic,
        occasion,
        lyrics,
        audioUrl: url,
        voice: selectedVoice,
        style: selectedStyle,
        date: new Date().toLocaleString('ar-SA')
      });
    } catch (error: any) {
      console.error("Error generating audio:", error);
      setMetrics(prev => ({ 
        ...prev, 
        totalErrors: prev.totalErrors + 1, 
        lastError: error.message || 'Audio Generation Error' 
      }));
      toast.error(error.message || 'فشل توليد الصوت، يرجى المحاولة مرة أخرى');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      // @ts-ignore
      audioRef.current.preservesPitch = preservePitch;

      if (isPlaying) {
        audioRef.current.pause();
        if (effectRef.current) effectRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Playback failed:", err);
          setIsPlaying(false);
        });
        if (effectRef.current && selectedEffect !== 'none') {
          effectRef.current.volume = effectVolume;
          effectRef.current.play().catch(console.error);
        }
      }
    }
  };

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handlePreservePitchChange = (checked: boolean) => {
    setPreservePitch(checked);
    if (audioRef.current) {
      // @ts-ignore
      audioRef.current.preservesPitch = checked;
    }
  };

  const handleEffectChange = (effectId: string) => {
    setSelectedEffect(effectId);
    if (isPlaying && effectRef.current) {
      effectRef.current.pause();
      if (effectId !== 'none') {
        // Small delay to ensure source is updated
        setTimeout(() => {
          if (effectRef.current) {
            effectRef.current.volume = effectVolume;
            effectRef.current.play().catch(console.error);
          }
        }, 100);
      }
    }
  };

  return (
    <div className="min-h-screen shilat-gradient font-sans selection:bg-amber-900 selection:text-amber-100">
      <Toaster position="top-center" richColors />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 relative"
        >
          <div className="absolute top-0 left-0 flex items-center gap-2">
            <button 
              onClick={() => setIsDevMode(!isDevMode)}
              className={cn(
                "p-3 rounded-full border transition-all",
                isDevMode 
                  ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                  : "bg-stone-900/50 border-stone-800 text-stone-400 hover:text-amber-400"
              )}
              title={isDevMode ? "إيقاف وضع المطور" : "وضع المطور (محاكاة الشبكة)"}
            >
              <RefreshCw className={cn("w-6 h-6", isDevMode && "animate-spin")} />
            </button>
            <button 
              onClick={() => setShowPerformance(!showPerformance)}
              className={cn(
                "p-3 rounded-full border transition-all",
                showPerformance ? "bg-amber-500 border-amber-400 text-white" : "bg-stone-900/50 border-stone-800 text-stone-400 hover:text-amber-400"
              )}
              title="مراقبة الأداء"
            >
              <RefreshCw className={cn("w-6 h-6", (isGeneratingLyrics || isGeneratingAudio || isGeneratingPreview) && "animate-spin")} />
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-3 rounded-full bg-stone-900/50 border border-stone-800 text-stone-400 hover:text-amber-400 transition-all"
              title="السجل"
            >
              <History className="w-6 h-6" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-3 rounded-full bg-stone-900/50 border border-stone-800 text-stone-400 hover:text-amber-400 transition-all"
                title="تغيير المظهر"
              >
                <Palette className="w-6 h-6" />
              </button>
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute top-14 left-0 bg-stone-900 border border-stone-800 rounded-2xl p-2 shadow-2xl z-50 min-w-[180px]"
                  >
                    {THEMES.map((t) => (
                      <div key={t.id} className="flex flex-col">
                        <button
                          onClick={() => {
                            setCurrentTheme(t);
                            if (t.id !== 'custom') {
                              setShowThemeMenu(false);
                              toast.info(`تم تغيير المظهر إلى: ${t.name}`);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-right",
                            currentTheme.id === t.id ? "bg-stone-800 text-amber-400" : "text-stone-400 hover:bg-stone-800/50"
                          )}
                        >
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }} />
                          <span className="text-sm font-bold">{t.name}</span>
                        </button>
                        {t.id === 'custom' && currentTheme.id === 'custom' && (
                          <button
                            onClick={() => {
                              setShowCustomThemeEditor(true);
                              setShowThemeMenu(false);
                            }}
                            className="w-full text-xs text-amber-500 hover:text-amber-400 py-1 px-4 text-right"
                          >
                            تعديل الألوان
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="inline-flex items-center justify-center p-4 bg-amber-900/30 rounded-full mb-6 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Music className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-l from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
            اتركها علينا
          </h1>
          <p className="text-stone-400 text-xl max-w-2xl mx-auto font-serif italic">
            نصيغ لك أجمل القصائد النبطية ونحولها لشيلات حماسية تليق بمناسباتكم السعيدة
          </p>
        </motion.header>

        {/* Developer / Network Simulation Panel */}
        <AnimatePresence>
          {isDevMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass-panel rounded-3xl p-6 mb-8 border-amber-500/20 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                <h3 className="text-amber-500 font-bold">محاكي ظروف الشبكة (للمطورين)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-stone-400">
                    <span>تأخير الاستجابة (Latency)</span>
                    <span className="text-amber-500">{simLatency}ms</span>
                  </div>
                  <input 
                    type="range" min="0" max="5000" step="100"
                    value={simLatency}
                    onChange={(e) => setSimLatency(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-stone-400">
                    <span>فقدان الحزم / ضعف الإشارة (Packet Loss)</span>
                    <span className="text-amber-500">{simPacketLoss}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5"
                    value={simPacketLoss}
                    onChange={(e) => setSimPacketLoss(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
              <p className="mt-4 text-[10px] text-stone-500 italic">
                * سيؤدي رفع "فقدان الحزم" إلى تقطيع الصوت بشكل عشوائي ومحاكاة عمليات التخزين المؤقت (Buffering).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Performance Monitoring Panel */}
        <AnimatePresence>
          {showPerformance && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="glass-panel rounded-3xl p-6 border-amber-500/20 bg-amber-900/5">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-amber-500 font-bold">لوحة مراقبة الأداء وتحسينه</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Latency Metrics */}
                  <div className="space-y-4">
                    <h4 className="text-stone-400 text-xs font-bold uppercase tracking-wider">زمن الاستجابة</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'توليد الكلمات:', value: metrics.lyricsLatency, threshold: 5000 },
                        { label: 'توليد المقطع الصوتي:', value: metrics.audioLatency, threshold: 8000 },
                        { label: 'توليد صورة العرض:', value: metrics.imageLatency, threshold: 10000 },
                      ].map((metric, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-500">{metric.label}</span>
                            <span className={cn("font-mono", metric.value && metric.value > metric.threshold ? "text-red-400" : "text-green-400")}>
                              {metric.value ? `${(metric.value / 1000).toFixed(2)}s` : '---'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", metric.value && metric.value > metric.threshold ? "bg-red-500" : "bg-green-500")}
                              style={{ width: `${metric.value ? Math.min((metric.value / metric.threshold) * 100, 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health Metrics */}
                  <div className="space-y-4">
                    <h4 className="text-stone-400 text-xs font-bold uppercase tracking-wider">حالة النظام</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">عدد الأخطاء:</span>
                        <span className={cn("font-mono", metrics.totalErrors > 0 ? "text-red-400" : "text-green-400")}>
                          {metrics.totalErrors}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">انقطاعات البث الصوتي:</span>
                        <span className={cn("font-mono", metrics.bufferingEvents > 2 ? "text-amber-400" : "text-green-400")}>
                          {metrics.bufferingEvents}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Optimization Suggestions */}
                  <div className="space-y-4">
                    <h4 className="text-stone-400 text-xs font-bold uppercase tracking-wider">مقترحات التحسين</h4>
                    <div className="p-3 bg-stone-900/50 rounded-xl border border-stone-800">
                      <p className="text-xs text-stone-400 leading-relaxed">
                        {metrics.totalErrors > 0 ? (
                          <span className="text-red-400/80">⚠️ تم رصد أخطاء متكررة. يرجى التحقق من اتصال الإنترنت أو تقليل طول الوصف.</span>
                        ) : metrics.lyricsLatency && metrics.lyricsLatency > 7000 ? (
                          <span className="text-amber-400/80">💡 زمن توليد الكلمات مرتفع. حاول كتابة موضوع أكثر تحديداً لتحسين السرعة.</span>
                        ) : metrics.bufferingEvents > 0 ? (
                          <span className="text-amber-400/80">💡 تم رصد تقطيع في الصوت. يرجى التأكد من استقرار الشبكة.</span>
                        ) : (
                          <span className="text-green-400/80">✅ أداء النظام مثالي حالياً. جميع العمليات تتم ضمن النطاق الزمني المتوقع.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {metrics.lastError && (
                  <div className="mt-6 pt-4 border-t border-amber-500/10">
                    <div className="flex items-start gap-2 text-[10px] font-mono text-red-400/60 break-all">
                      <span className="font-bold shrink-0">آخر خطأ:</span>
                      <span>{metrics.lastError}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="space-y-8">
          {/* Configuration Section */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 shadow-2xl border-amber-900/20"
          >
            <div className="space-y-8">
              {/* Language Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4 mr-2">
                  <label className="block text-amber-500/80 text-sm font-bold">اختر اللغة أو اللهجة</label>
                  <Info className="w-3 h-3 text-stone-600" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1 group",
                        selectedLanguage === lang.id 
                          ? "bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                          : "bg-stone-900/40 border-stone-800 text-stone-500 hover:border-stone-700 hover:text-stone-300"
                      )}
                    >
                      <span className="text-2xl mb-1">{lang.flag}</span>
                      <span className="font-bold text-xs">{lang.name}</span>
                      <span className="text-[9px] opacity-50 text-center leading-tight hidden md:block">{lang.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4 mr-2">
                  <label className="block text-amber-500/80 text-sm font-bold">طول القصيدة المقترح</label>
                </div>
                <div className="flex gap-3">
                  {[
                    { id: 'short', name: 'قصيرة' },
                    { id: 'medium', name: 'متوسطة' },
                    { id: 'long', name: 'طويلة' },
                  ].map((len) => (
                    <button
                      key={len.id}
                      onClick={() => setLength(len.id as any)}
                      className={cn(
                        "flex-1 p-3 rounded-2xl border transition-all font-bold text-sm",
                        length === len.id 
                          ? "bg-amber-900/40 border-amber-500 text-amber-400" 
                          : "bg-stone-900/40 border-stone-800 text-stone-500 hover:border-stone-700"
                      )}
                    >
                      {len.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Occasion Selection */}
              <div>
                <div className="flex items-center gap-2 mb-4 mr-2">
                  <label className="block text-amber-500/80 text-sm font-bold">اختر لون الفن الشعري</label>
                  <Info className="w-3 h-3 text-stone-600" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ.id}
                      onClick={() => setOccasion(occ.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2 group",
                        occasion === occ.id 
                          ? "bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                          : "bg-stone-900/40 border-stone-800 text-stone-500 hover:border-stone-700 hover:text-stone-300"
                      )}
                    >
                      <occ.icon className={cn(
                        "w-6 h-6 transition-transform group-hover:scale-110",
                        occasion === occ.id ? "text-amber-400" : "text-stone-600"
                      )} />
                      <span className="font-bold text-xs">{occ.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Input */}
              <div className="relative">
                <label className="block text-amber-500/80 text-sm font-bold mb-4 mr-2">موضوع القصيدة أو الفكرة</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => {
                        setTopic(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                      placeholder="مثلاً: مدح العريس، ترحيب بالضيوف، فخر بالقبيلة..."
                      className="w-full bg-stone-900/50 border border-stone-700 rounded-2xl py-5 px-6 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all text-lg placeholder:text-stone-600"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateLyrics()}
                    />
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 w-6 h-6 opacity-40" />
                    
                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-1 mb-1">
                              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">اقتراحات لـ {occasion}</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFetchAISuggestions();
                                }}
                                disabled={isGeneratingSuggestions}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                {isGeneratingSuggestions ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>اقتراحات ذكية</span>
                              </button>
                            </div>
                            {filteredSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setTopic(s);
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-right px-4 py-3 hover:bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors text-sm font-bold flex items-center justify-between group"
                              >
                                <span>{s}</span>
                                <div className="flex items-center gap-2">
                                  {aiSuggestions.includes(s) && <Sparkles className="w-3 h-3 text-amber-500/60" />}
                                  <Send className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                                </div>
                              </button>
                            ))}
                            {filteredSuggestions.length === 0 && (
                              <div className="p-4 text-center text-stone-600 text-xs">
                                لا توجد اقتراحات تطابق بحثك
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={handleGenerateLyrics}
                    disabled={isGeneratingLyrics || !topic.trim()}
                    className={cn(
                      "px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-lg",
                      isGeneratingLyrics || !topic.trim() 
                        ? "bg-stone-800 text-stone-500 cursor-not-allowed" 
                        : "bg-gradient-to-l from-amber-700 to-amber-500 text-white shadow-xl shadow-amber-900/30 active:scale-95 hover:brightness-110"
                    )}
                  >
                    {isGeneratingLyrics ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span>جاري صياغة القصيدة...</span>
                        </div>
                        <div className="w-32 bg-stone-800 rounded-full h-1 overflow-hidden">
                          <motion.div
                            className="bg-amber-500 h-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Send className="w-6 h-6 rotate-180" />
                        <span>صياغة القصيدة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Lyrics Display */}
          <AnimatePresence>
            {lyrics && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel rounded-3xl p-10 relative overflow-hidden border-amber-900/20"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/5 blur-[100px] rounded-full -mr-24 -mt-24" />
                
                <div className="flex justify-between items-center mb-10 border-b border-stone-800 pb-6">
                  <h2 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
                    <Mic className="w-8 h-8" />
                    القصيدة المُولّدة
                  </h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleCopyLyrics(lyrics)}
                      className="text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-2 text-sm font-bold"
                      title="نسخ الكلمات"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="hidden md:inline">نسخ</span>
                    </button>
                    <button 
                      onClick={() => handleDownloadLyrics(lyrics, topic)}
                      className="text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-2 text-sm font-bold"
                      title="تحميل الكلمات"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden md:inline">تحميل</span>
                    </button>
                    <button 
                      onClick={() => setLyrics('')}
                      className="text-stone-500 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-bold"
                      title="مسح القصيدة"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden md:inline">مسح</span>
                    </button>
                  </div>
                </div>

                <div className="font-serif text-2xl md:text-3xl leading-[2] text-center space-y-8 text-stone-100 max-w-3xl mx-auto">
                  {lyrics.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const parts = line.split('|');
                    if (parts.length === 2) {
                      return (
                        <div key={idx} className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 group">
                          <span className="flex-1 text-right text-amber-100/90 group-hover:text-amber-400 transition-colors">{parts[0].trim()}</span>
                          <span className="hidden md:block text-amber-600/30 font-bold">||</span>
                          <span className="flex-1 text-left text-amber-100/90 group-hover:text-amber-400 transition-colors">{parts[1].trim()}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="text-amber-100/90 hover:text-amber-400 transition-colors">
                        {line.trim()}
                      </div>
                    );
                  })}
                </div>

                {/* Style Selection */}
                <div className="mt-16 pt-10 border-t border-stone-800/50">
                  <label className="block text-amber-500/80 text-sm font-bold mb-6 text-center">اختر أسلوب الأداء</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {DELIVERY_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyle(style.id);
                          setAudioUrl(null); // Reset audio when style changes
                        }}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative group",
                          selectedStyle === style.id 
                            ? "bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/30" 
                            : "bg-stone-900/40 border-stone-800 hover:border-stone-700"
                        )}
                      >
                        <span className="text-3xl">{style.icon}</span>
                        <span className={cn("text-sm font-bold", selectedStyle === style.id ? "text-amber-200" : "text-stone-400")}>
                          {style.name}
                        </span>
                        
                        {/* Style Preview Button */}
                        <button
                          onClick={(e) => handlePreview(selectedVoice, style.id, e)}
                          className={cn(
                            "absolute top-2 left-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100",
                            previewingStyle === style.id && previewingVoice === selectedVoice
                              ? "bg-amber-500 text-white opacity-100" 
                              : "bg-stone-800 text-stone-400 hover:text-amber-400"
                          )}
                          title="تجربة الأداء"
                        >
                          {previewingStyle === style.id && previewingVoice === selectedVoice && isPreviewLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : previewingStyle === style.id && previewingVoice === selectedVoice ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </button>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="mt-10 pt-10 border-t border-stone-800/50">
                  <div className="flex items-center justify-between mb-6">
                    <label className="block text-amber-500/80 text-sm font-bold">اختر صوت الشيلة</label>
                    <button 
                      onClick={() => setShowVoiceStudio(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all text-xs font-bold"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>استوديو الأصوات المتقدم</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    {VOICE_OPTIONS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVoice(v.id);
                          setAudioUrl(null); // Reset audio when voice changes
                        }}
                        className={cn(
                          "p-4 rounded-2xl border text-right transition-all relative group",
                          selectedVoice === v.id 
                            ? "bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/30" 
                            : "bg-stone-900/40 border-stone-800 hover:border-stone-700"
                        )}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold", selectedVoice === v.id ? "text-amber-200" : "text-stone-300")}>{v.name}</span>
                            {selectedVoice === v.id && <Check className="w-4 h-4 text-amber-500" />}
                          </div>
                          
                          {/* Preview Button */}
                          <button
                            onClick={(e) => handlePreview(v.id, selectedStyle, e)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold",
                              previewingVoice === v.id && previewingStyle === selectedStyle
                                ? "bg-amber-500 text-white" 
                                : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-amber-400"
                            )}
                          >
                            {previewingVoice === v.id && previewingStyle === selectedStyle && isPreviewLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : previewingVoice === v.id && previewingStyle === selectedStyle ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 mr-0.5" />
                            )}
                            <span>{previewingVoice === v.id && previewingStyle === selectedStyle ? "إيقاف" : "تجربة الصوت"}</span>
                          </button>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">{v.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Hidden Preview Audio */}
                  <audio 
                    ref={previewAudioRef} 
                    className="hidden" 
                    onEnded={() => {
                      setPreviewingVoice(null);
                      setPreviewingStyle(null);
                    }}
                  />

                  <div className="flex flex-col items-center gap-6">
                    {!audioUrl ? (
                      <button
                        onClick={handleGenerateAudio}
                        disabled={isGeneratingAudio}
                        className={cn(
                          "group relative px-12 py-6 rounded-full font-bold text-2xl overflow-hidden transition-all",
                          isGeneratingAudio 
                            ? "bg-stone-800 text-stone-500 cursor-not-allowed" 
                            : "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 text-white hover:shadow-[0_0_40px_rgba(180,83,9,0.3)] active:scale-95"
                        )}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <div className="relative flex items-center gap-4">
                          {isGeneratingAudio ? (
                            <div className="flex flex-col items-center gap-4 w-full">
                              <div className="flex items-center gap-4">
                                <RefreshCw className="w-8 h-8 animate-spin" />
                                <span>جاري توليد الشيلة...</span>
                              </div>
                              <div className="w-full max-w-md bg-stone-800 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  className="bg-amber-500 h-full"
                                  initial={{ width: "0%" }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 10, ease: "linear" }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <Volume2 className="w-8 h-8" />
                              <span>تحويل إلى شيلة صوتية</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-6">
                        <div className="flex items-center gap-6 bg-stone-900/50 p-6 rounded-3xl border border-amber-900/20 relative overflow-hidden">
                          {isBuffering && (
                            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                              <span className="text-amber-500 text-xs font-bold animate-pulse">جاري التخزين المؤقت...</span>
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <Visualizer isPlaying={isPlaying} />
                          </div>
                          <button
                            onClick={togglePlay}
                            className="w-24 h-24 bg-amber-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(217,119,6,0.4)] hover:bg-amber-500 transition-all active:scale-90 z-10"
                          >
                            {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 mr-2" />}
                          </button>
                          <div className="flex flex-col z-10">
                            <span className="text-amber-400 font-bold text-2xl">الشيلة جاهزة</span>
                            <span className="text-stone-500 text-lg">بصوت: {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}</span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-lg mt-8 bg-stone-900/40 p-6 rounded-3xl border border-stone-800">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-stone-400 text-sm font-bold">مستوى صوت الشيلة</span>
                              <span className="text-amber-500 font-mono font-bold">{Math.round(mainVolume * 100)}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05" 
                              value={mainVolume} 
                              onChange={(e) => setMainVolume(parseFloat(e.target.value))}
                              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-stone-400 text-sm font-bold">سرعة الإيقاع</span>
                              <span className="text-amber-500 font-mono font-bold">{playbackRate}x</span>
                            </div>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="2" 
                              step="0.1" 
                              value={playbackRate} 
                              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex gap-2 mt-2">
                              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => handleRateChange(rate)}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all border",
                                    playbackRate === rate
                                      ? "bg-amber-500 border-amber-400 text-white"
                                      : "bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600"
                                  )}
                                >
                                  {rate === 1.0 ? "طبيعي" : `${rate}x`}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-stone-400 text-sm font-bold">تغيير الطبقة (Pitch)</span>
                              <span className={cn("text-sm font-bold", !preservePitch ? "text-amber-500" : "text-stone-600")}>
                                {!preservePitch ? "مفعل" : "معطل"}
                              </span>
                            </div>
                            <button
                              onClick={() => handlePreservePitchChange(!preservePitch)}
                              className={cn(
                                "w-full py-3 rounded-xl font-bold text-sm transition-all border",
                                !preservePitch 
                                  ? "bg-amber-900/20 border-amber-500/50 text-amber-200" 
                                  : "bg-stone-800/50 border-stone-700 text-stone-500 hover:border-stone-600"
                              )}
                            >
                              {!preservePitch ? "الطبقة تتغير مع السرعة" : "الطبقة ثابتة (افتراضي)"}
                            </button>
                          </div>

                          {/* Background Effects */}
                          <div className="md:col-span-2 space-y-6 pt-6 border-t border-stone-800">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <span className="text-amber-500/80 text-sm font-bold">المؤثرات الاحتفالية المصاحبة</span>
                              <div className="flex items-center gap-4">
                                <span className="text-stone-500 text-xs text-right">مستوى صوت المؤثر</span>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="1" 
                                  step="0.1" 
                                  value={effectVolume} 
                                  onChange={(e) => setEffectVolume(parseFloat(e.target.value))}
                                  className="w-32 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {EFFECTS.map((eff) => (
                                <button
                                  key={eff.id}
                                  onClick={() => handleEffectChange(eff.id)}
                                  className={cn(
                                    "py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                                    selectedEffect === eff.id 
                                      ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-900/20" 
                                      : "bg-stone-800/50 border-stone-700 text-stone-500 hover:border-stone-600"
                                  )}
                                >
                                  {eff.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {audioUrl && (
                          <audio 
                            key={audioUrl}
                            ref={audioRef} 
                            src={audioUrl} 
                            onEnded={() => {
                              setIsPlaying(false);
                              if (effectRef.current) effectRef.current.pause();
                            }}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            className="hidden"
                            onError={(e) => {
                              console.error("Audio element error:", e);
                              setAudioUrl(null);
                              setIsPlaying(false);
                            }}
                          />
                        )}

                        {/* Effect Audio Element */}
                        {selectedEffect !== 'none' && (
                          <audio 
                            ref={effectRef}
                            src={EFFECTS.find(e => e.id === selectedEffect)?.url}
                            loop
                            className="hidden"
                          />
                        )}

                        <div className="flex flex-col items-center gap-6 w-full mt-8">
                          {previewImageUrl ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-full max-w-lg aspect-video rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl relative group"
                            >
                              <img 
                                src={previewImageUrl} 
                                alt="Shila Preview" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                                <p className="text-amber-400 font-bold text-xl mb-1">{topic}</p>
                                <p className="text-stone-300 text-sm">{occasion} • بصوت {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name}</p>
                              </div>
                              <button 
                                onClick={() => setPreviewImageUrl(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/50 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ) : (
                            <button
                              onClick={handleGeneratePreview}
                              disabled={isGeneratingPreview}
                              className="flex items-center gap-3 bg-stone-800/50 hover:bg-stone-800 text-amber-500/80 py-4 px-8 rounded-2xl border border-stone-700 hover:border-amber-500/30 transition-all font-bold group"
                            >
                              {isGeneratingPreview ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <Sparkles className="w-5 h-5 group-hover:scale-125 transition-transform" />
                              )}
                              <span>إنشاء صورة عرض للمشاركة</span>
                            </button>
                          )}

                          <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                              <button
                                onClick={() => handleDownloadAudio(audioUrl, topic || 'shila', 'mp3')}
                                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-400 py-3 px-4 rounded-xl transition-all border border-stone-700 hover:border-amber-500/30 font-bold"
                              >
                                <Download className="w-5 h-5" />
                                <span>MP3</span>
                              </button>
                              <button
                                onClick={() => handleDownloadAudio(audioUrl, topic || 'shila', 'wav')}
                                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-400 py-3 px-4 rounded-xl transition-all border border-stone-700 hover:border-amber-500/30 font-bold"
                              >
                                <Download className="w-5 h-5" />
                                <span>WAV</span>
                              </button>
                              <button
                                onClick={() => handleDownloadAudio(audioUrl, topic || 'shila', 'flac')}
                                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-400 py-3 px-4 rounded-xl transition-all border border-stone-700 hover:border-amber-500/30 font-bold"
                              >
                                <Download className="w-5 h-5" />
                                <span>FLAC</span>
                              </button>
                            </div>

                            <div className="flex-1 min-w-[200px] flex items-center justify-center gap-2">
                              <button
                                onClick={() => shareToPlatform('twitter')}
                                className="p-4 bg-stone-800 hover:bg-stone-700 text-sky-400 rounded-2xl border border-stone-700 transition-all"
                                title="تويتر"
                              >
                                <Share2 className="w-6 h-6" />
                              </button>
                              <button
                                onClick={() => shareToPlatform('whatsapp')}
                                className="p-4 bg-stone-800 hover:bg-stone-700 text-green-500 rounded-2xl border border-stone-700 transition-all"
                                title="واتساب"
                              >
                                <Send className="w-6 h-6" />
                              </button>
                              <button
                                onClick={handleShare}
                                className="flex-1 flex items-center justify-center gap-3 bg-stone-800 hover:bg-stone-700 text-stone-300 py-4 px-6 rounded-2xl transition-all border border-stone-700 hover:border-stone-600 font-bold"
                              >
                                <Share2 className="w-6 h-6" />
                                <span>مشاركة</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
              onClick={() => setShowHistory(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-stone-900 border border-stone-800 w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-stone-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <History className="text-amber-500" />
                      <h2 className="text-2xl font-bold">سجل الشيلات</h2>
                    </div>
                    <button 
                      onClick={clearHistory}
                      className="text-stone-500 hover:text-red-400 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      مسح السجل
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="ابحث في السجل..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
                    />
                    <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-stone-600">
                      <Music className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>{historySearch ? 'لا توجد نتائج تطابق بحثك' : 'لا يوجد شيلات في السجل بعد'}</p>
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div key={item.id} className="bg-stone-800/50 p-4 rounded-2xl border border-stone-700/50 flex items-center justify-between gap-4 group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-900/50 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{item.occasion}</span>
                            <span className="text-stone-500 text-[10px]">{item.date}</span>
                            <span className="text-stone-600 text-[10px]">• {VOICE_OPTIONS.find(v => v.id === item.voice)?.name || item.voice}</span>
                            <span className="text-stone-600 text-[10px]">• {DELIVERY_STYLES.find(s => s.id === item.style)?.name || item.style}</span>
                          </div>
                          <h3 className="font-bold text-stone-200 line-clamp-1">{item.topic}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLyrics(item.lyrics)}
                            className="p-2 text-stone-600 hover:text-amber-400 transition-colors"
                            title="نسخ الكلمات"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadLyrics(item.lyrics, item.topic)}
                            className="p-2 text-stone-600 hover:text-amber-400 transition-colors"
                            title="تحميل الكلمات"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadAudio(item.audioUrl, item.topic, 'mp3')}
                            className="p-2 text-stone-600 hover:text-amber-400 transition-colors"
                            title="تحميل الصوت (MP3)"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span className="text-[8px] font-bold">MP3</span>
                          </button>
                          <button
                            onClick={() => handleDownloadAudio(item.audioUrl, item.topic, 'wav')}
                            className="p-2 text-stone-600 hover:text-amber-400 transition-colors"
                            title="تحميل الصوت (WAV)"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span className="text-[8px] font-bold">WAV</span>
                          </button>
                          <button
                            onClick={() => handleDownloadAudio(item.audioUrl, item.topic, 'flac')}
                            className="p-2 text-stone-600 hover:text-amber-400 transition-colors"
                            title="تحميل الصوت (FLAC)"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span className="text-[8px] font-bold">FLAC</span>
                          </button>
                          <button
                            onClick={() => deleteFromHistory(item.id)}
                            className="p-2 text-stone-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAudioUrl(item.audioUrl);
                              setLyrics(item.lyrics);
                              setTopic(item.topic);
                              setOccasion(item.occasion);
                              setSelectedVoice(item.voice as VoiceOption);
                              setSelectedStyle((item.style as DeliveryStyle) || 'enthusiastic');
                              setShowHistory(false);
                              toast.success('تم استعادة الشيلة من السجل');
                            }}
                            className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-full transition-all"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Studio Modal */}
        <AnimatePresence>
          {showVoiceStudio && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-stone-900 border border-stone-800 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              >
                {/* Header */}
                <div className="p-8 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl">
                      <Sparkles className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-amber-200">استوديو الأصوات المتقدم</h2>
                      <p className="text-stone-500 text-sm">قارن بين الأصوات والأنماط المختلفة لاختيار الأنسب لقصيدتك</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsComparisonMode(!isComparisonMode)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-2xl transition-all font-bold text-sm border",
                        isComparisonMode 
                          ? "bg-amber-600 text-white border-amber-500" 
                          : "bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-600"
                      )}
                    >
                      <Layers className="w-5 h-5" />
                      {isComparisonMode ? "وضع المقارنة مفعل" : "تفعيل وضع المقارنة"}
                    </button>
                    <button 
                      onClick={() => setShowVoiceStudio(false)}
                      className="p-3 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                  {/* Advanced Settings */}
                  <div className="mb-8 p-6 bg-stone-800/20 rounded-3xl border border-stone-800">
                    <h3 className="text-amber-500 font-bold mb-4">إعدادات الصوت المتقدمة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-stone-400 text-sm">الطبقة (Pitch): {pitch.toFixed(1)}</label>
                        <input 
                          type="range" min="0.5" max="2" step="0.1"
                          value={pitch}
                          onChange={(e) => setPitch(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-stone-400 text-sm">محاكاة النطاق الترددي: {bandwidth} Mbps</label>
                        <input 
                          type="range" min="0.5" max="100" step="0.5"
                          value={bandwidth}
                          onChange={(e) => setBandwidth(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-xs text-stone-500">
                          <span>3G (0.5)</span>
                          <span>4G (10)</span>
                          <span>Wi-Fi (100)</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <label className="text-stone-400 text-sm">نص تجريبي (محاكي الصوت):</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={customPreviewText}
                          onChange={(e) => setCustomPreviewText(e.target.value)}
                          placeholder="اكتب نصاً لتجربة الصوت..."
                          className="flex-1 bg-stone-900 border border-stone-700 rounded-2xl py-3 px-4 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                        <button 
                          onClick={() => handleTestVoice(customPreviewText)}
                          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-sm transition-all"
                        >
                          تجربة
                        </button>
                      </div>
                    </div>
                  </div>

                  {isComparisonMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Voice 1 Selection */}
                      <div className="space-y-4">
                        <h3 className="text-amber-500 font-bold">الصوت الأول</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {VOICE_OPTIONS.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVoice(v.id)}
                              className={cn(
                                "w-full p-4 rounded-2xl border text-right transition-all",
                                selectedVoice === v.id ? "bg-amber-900/20 border-amber-500" : "bg-stone-800/30 border-stone-800"
                              )}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                        <h4 className="text-stone-400 text-sm font-bold mt-4">النمط</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {DELIVERY_STYLES.slice(0, 4).map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setSelectedStyle(style.id)}
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold transition-all",
                                selectedStyle === style.id ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400"
                              )}
                            >
                              {style.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Voice 2 Selection */}
                      <div className="space-y-4">
                        <h3 className="text-amber-500 font-bold">الصوت الثاني</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {VOICE_OPTIONS.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVoice2(v.id)}
                              className={cn(
                                "w-full p-4 rounded-2xl border text-right transition-all",
                                selectedVoice2 === v.id ? "bg-amber-900/20 border-amber-500" : "bg-stone-800/30 border-stone-800"
                              )}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                        <h4 className="text-stone-400 text-sm font-bold mt-4">النمط</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {DELIVERY_STYLES.slice(0, 4).map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setSelectedStyle2(style.id)}
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold transition-all",
                                selectedStyle2 === style.id ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400"
                              )}
                            >
                              {style.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {VOICE_OPTIONS.map((v) => (
                        <div 
                          key={v.id}
                          className={cn(
                            "p-6 rounded-3xl border transition-all group relative overflow-hidden",
                            selectedVoice === v.id ? "bg-amber-900/10 border-amber-500/30" : "bg-stone-800/30 border-stone-800 hover:border-stone-700"
                          )}
                        >
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-lg font-bold text-amber-100">{v.name}</span>
                              {selectedVoice === v.id && <div className="px-2 py-1 bg-amber-500 text-black text-[10px] font-bold rounded-lg uppercase">مختار حالياً</div>}
                            </div>
                            <p className="text-stone-500 text-xs mb-6 leading-relaxed">{v.description}</p>
                            
                            <div className="space-y-3">
                              <p className="text-[10px] text-stone-600 font-bold uppercase tracking-wider">معاينة الأنماط:</p>
                              <div className="flex flex-wrap gap-2">
                                {DELIVERY_STYLES.slice(0, 4).map((style) => (
                                  <button
                                    key={style.id}
                                    onClick={(e) => handlePreview(v.id, style.id, e)}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                                      previewingVoice === v.id && previewingStyle === style.id
                                        ? "bg-amber-500 text-black"
                                        : "bg-stone-900/50 text-stone-400 hover:text-amber-400 border border-stone-800"
                                    )}
                                  >
                                    {previewingVoice === v.id && previewingStyle === style.id && isPreviewLoading ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : previewingVoice === v.id && previewingStyle === style.id ? (
                                      <Pause className="w-3 h-3" />
                                    ) : (
                                      <span>{style.icon} {style.name}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedVoice(v.id);
                              toast.success(`تم اختيار ${v.name}`);
                            }}
                            className={cn(
                              "w-full mt-6 py-3 rounded-2xl font-bold text-xs transition-all",
                              selectedVoice === v.id 
                                ? "bg-amber-500 text-black shadow-lg shadow-amber-900/20" 
                                : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                            )}
                          >
                            {selectedVoice === v.id ? 'تم الاختيار' : 'اختيار هذا الصوت'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-stone-800 bg-stone-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-500 text-xs">
                    <Info className="w-4 h-4" />
                    <span>المعاينات في الاستوديو أطول وأكثر دقة لتسهيل عملية الاختيار</span>
                  </div>
                  <button 
                    onClick={() => setShowVoiceStudio(false)}
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-amber-900/20"
                  >
                    إغلاق الاستوديو
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="mt-24 text-center border-t border-stone-800 pt-12">
          <p className="text-amber-600/60 text-lg font-serif italic mb-2">"اتركها علينا"</p>
          <p className="text-stone-600 text-sm">© {new Date().getFullYear()} جميع الحقوق محفوظة - مدعوم بالذكاء الاصطناعي</p>
        </footer>
        {/* Custom Theme Editor Modal */}
        <AnimatePresence>
          {showCustomThemeEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full"
              >
                <h2 className="text-2xl font-bold text-amber-500 mb-6">تخصيص المظهر</h2>
                <div className="space-y-4">
                  {Object.entries(customTheme).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-stone-400 capitalize">{key}</label>
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => setCustomTheme(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-4 mt-8">
                  <button
                    onClick={() => setShowCustomThemeEditor(false)}
                    className="px-6 py-2 rounded-xl bg-stone-800 text-stone-400 hover:bg-stone-700"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('custom_theme', JSON.stringify(customTheme));
                      setShowCustomThemeEditor(false);
                      toast.success('تم حفظ المظهر المخصص');
                    }}
                    className="px-6 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-500"
                  >
                    حفظ
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
