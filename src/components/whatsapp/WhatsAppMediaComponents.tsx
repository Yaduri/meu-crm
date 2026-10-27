import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  ExternalLink,
  FileText,
  X,
  Volume2
} from 'lucide-react';

// ==========================================
// PLAYER DE ÁUDIO ESTILO WHATSAPP
// ==========================================
export const AudioMessagePlayer: React.FC<{
  src: string;
  isMe: boolean;
}> = ({ src, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
          isMe
            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
        title={isPlaying ? 'Pausar áudio' : 'Ouvir áudio'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-zinc-700/60 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span>{formatSeconds(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Volume2 size={10} className="opacity-70" />
            {formatSeconds(duration || currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CARD DE DOCUMENTO (PDF, DOC, ETC)
// ==========================================
export const DocumentMessageCard: React.FC<{
  url: string;
  filename?: string | null;
  isMe: boolean;
}> = ({ url, filename, isMe }) => {
  const displayName = filename || url.split('/').pop() || 'Documento';
  const isPdf = displayName.toLowerCase().endsWith('.pdf');

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-xl border my-1 transition-colors ${
        isMe
          ? 'bg-emerald-900/30 border-emerald-500/30 hover:bg-emerald-900/40'
          : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isPdf ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        }`}
      >
        <FileText size={20} />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <p className="font-medium text-xs text-zinc-200 truncate" title={displayName}>
          {displayName}
        </p>
        <p className="text-[10px] text-zinc-400 uppercase font-semibold">
          {isPdf ? 'Documento PDF' : 'Arquivo anexado'}
        </p>
      </div>

      <a
        href={url}
        download={displayName}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-lg bg-zinc-700/50 hover:bg-zinc-600 text-zinc-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
        title="Baixar arquivo"
      >
        <Download size={14} />
      </a>
    </div>
  );
};

// ==========================================
// VISUALIZADOR DE IMAGENS COM LIGHTBOX
// ==========================================
export const ImageMessageViewer: React.FC<{
  src: string;
  alt?: string;
}> = ({ src, alt = 'Foto do WhatsApp' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="relative group cursor-pointer my-1 rounded-xl overflow-hidden border border-zinc-700/40">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onClick={() => setIsOpen(true)}
          className="max-w-[260px] sm:max-w-[300px] max-h-[300px] object-cover rounded-xl transition-transform group-hover:scale-[1.02]"
        />
        <div
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold"
        >
          <ExternalLink size={16} />
          Ampliar
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 right-0 flex items-center gap-3">
              <a
                href={src}
                download="whatsapp-imagem.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
                title="Baixar imagem"
              >
                <Download size={18} />
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-zinc-800 text-zinc-200 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
