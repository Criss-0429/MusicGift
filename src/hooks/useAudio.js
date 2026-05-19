import { useState, useRef, useEffect, useCallback } from 'react';

// List of public Piped instances for high availability YouTube stream resolving
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.syncord.org',
  'https://api.piped.yt',
  'https://pipedapi.colbyland.xyz',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.us.to'
];

/**
 * Robust helper to resolve direct audio stream from a YouTube video ID.
 * Tries multiple public Piped instances until one succeeds.
 */
async function resolveYoutubeStream(videoId) {
  let lastError = null;
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout per instance

      const res = await fetch(`${instance}/streams/${videoId}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      
      // Get the highest quality audio stream (usually 128kbps M4A or WebM)
      if (data.audioStreams && data.audioStreams.length > 0) {
        // Prefer M4A for iOS background compatibility, otherwise take first
        const m4aStream = data.audioStreams.find(s => s.format === 'M4A' || s.mimeType?.includes('audio/mp4'));
        const chosenStream = m4aStream || data.audioStreams[0];
        
        // Return stream URL, plus metadata if needed
        return {
          streamUrl: chosenStream.url,
          title: data.title,
          uploader: data.uploader,
          thumbnailUrl: data.thumbnailUrl
        };
      }
    } catch (err) {
      console.warn(`Piped instance ${instance} failed to resolve ${videoId}:`, err);
      lastError = err;
    }
  }
  throw new Error(lastError ? `Could not resolve stream: ${lastError.message}` : 'Failed to resolve YouTube audio stream across all servers.');
}

export default function useAudio(tracks, playMode = 'normal') {
  const audioRef = useRef(new Audio());
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;

  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('cupid-volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [muted, setMuted] = useState(false);

  const track = tracks[trackIndex] ?? { title: 'No track', artist: '', file: '', art: null };
  const audio = audioRef.current;
  audio.volume = muted ? 0 : volume;

  // Sync index when tracks array length drops or changes
  const prevTracksRef = useRef(tracks);
  if (prevTracksRef.current !== tracks) {
    prevTracksRef.current = tracks;
    if (trackIndex >= tracks.length && tracks.length > 0) {
      setTrackIndex(0);
    }
  }

  // Playback functions
  const play = useCallback(() => {
    if (audio.src) {
      audio.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });
      setIsPlaying(true);
    }
  }, [audio]);

  const pause = useCallback(() => {
    audio.pause();
    setIsPlaying(false);
  }, [audio]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    setTrackIndex((prevIndex) => {
      if (tracks.length === 0) return 0;
      if (playModeRef.current === 'shuffle' && tracks.length > 1) {
        let n;
        do { n = Math.floor(Math.random() * tracks.length); } while (n === prevIndex);
        return n;
      }
      return (prevIndex + 1) % tracks.length;
    });
  }, [tracks]);

  const prev = useCallback(() => {
    if (audio.currentTime > 4) {
      audio.currentTime = 0;
    } else {
      setTrackIndex((prevIndex) => {
        if (tracks.length === 0) return 0;
        return (prevIndex - 1 + tracks.length) % tracks.length;
      });
    }
  }, [tracks, audio]);

  const seek = useCallback((fraction) => {
    if (audio.duration) {
      audio.currentTime = Math.min(fraction, 1) * audio.duration;
    }
  }, [audio]);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    audio.volume = clamped;
    localStorage.setItem('cupid-volume', clamped.toString());
    if (clamped > 0) setMuted(false);
  }, [audio]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audio.volume = m ? volume : 0;
      return !m;
    });
  }, [volume, audio]);

  // Load track when index or playlist changes
  useEffect(() => {
    const t = tracks[trackIndex];
    if (!t) {
      audio.src = '';
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadingError(null);

    (async () => {
      try {
        let srcUrl = '';

        if (t.source === 'youtube') {
          const resolved = await resolveYoutubeStream(t.videoId);
          srcUrl = resolved.streamUrl;
        } else if (t.audioBlob) {
          // If song is stored as a blob in IndexedDB
          srcUrl = URL.createObjectURL(t.audioBlob);
        } else {
          // Local/pre-packaged assets stored in /public/audio/
          srcUrl = t.file.startsWith('http') ? t.file : `./audio/${t.file}`;
        }

        if (!active) {
          if (srcUrl.startsWith('blob:')) URL.revokeObjectURL(srcUrl);
          return;
        }

        // Cleanup previous object URLs if they exist to prevent memory leaks
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }

        audio.src = srcUrl;
        audio.load();
        
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
        setIsLoading(false);

        // Resume if we were playing
        if (isPlayingRef.current) {
          audio.play().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load audio source:', err);
        if (active) {
          setLoadingError('Failed to load song stream');
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [trackIndex, tracks, audio]);

  // Handle standard audio event listeners and Media Session updates
  useEffect(() => {
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onPlay = () => {
      setIsPlaying(true);
      updateMediaSessionState('playing');
    };

    const onPause = () => {
      setIsPlaying(false);
      updateMediaSessionState('paused');
    };

    const onEnded = () => {
      if (playModeRef.current === 'repeat') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      next();
    };

    const updateMediaSessionState = (state) => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = state;
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audio, next]);

  // Synchronize system media session controls (iOS/Android Lock Screen widgets)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track || track.title === 'No track') return;

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Cristiano per Anamaria',
        album: 'Amore per Anamaria 💖',
        artwork: [
          { src: track.art || './covers/default.png', sizes: '96x96', type: 'image/png' },
          { src: track.art || './covers/default.png', sizes: '128x128', type: 'image/png' },
          { src: track.art || './covers/default.png', sizes: '192x192', type: 'image/png' },
          { src: track.art || './covers/default.png', sizes: '256x256', type: 'image/png' },
          { src: track.art || './covers/default.png', sizes: '384x384', type: 'image/png' },
          { src: track.art || './covers/default.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Bind lock screen button handlers
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', next);
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          audio.currentTime = details.seekTime;
        }
      });
    } catch (err) {
      console.warn('Media Session API failed to register:', err);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [track, play, pause, prev, next, audio]);

  return {
    track,
    trackIndex,
    setTrackIndex,
    isPlaying,
    isLoading,
    loadingError,
    progress,
    duration,
    currentTime,
    togglePlay,
    next,
    prev,
    seek,
    volume,
    setVolume,
    muted,
    toggleMute,
    play,
    pause
  };
}
export { resolveYoutubeStream };
