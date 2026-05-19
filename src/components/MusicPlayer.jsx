import React, { useState, useEffect, useRef, useCallback } from 'react';
import useTheme from '../hooks/useTheme';
import useAudio, { resolveYoutubeStream } from '../hooks/useAudio';
import { addSong, deleteSong } from '../db/musicDb';
import GiftMessage from './GiftMessage';

import progressBarStars from '../assets/progress_bar_stars.png';
import starImg from '../assets/star.png';
import starSelectedImg from '../assets/star_selected.png';

export default function MusicPlayer({ defaultTracks, customTracks, onPlaylistUpdated }) {
  const { theme, toggleTheme, assets } = useTheme();
  
  // Combine pre-loaded gift tracks with user uploaded tracks
  const allTracks = [...defaultTracks, ...customTracks];

  // Pass all tracks to our background audio engine
  const player = useAudio(allTracks);
  const {
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
  } = player;

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showLoveLetter, setShowLoveLetter] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isResolvingYt, setIsResolvingYt] = useState(false);
  const [ytError, setYtError] = useState('');
  
  // Record animations states
  const [recordFrame, setRecordFrame] = useState(0);
  const [needleFrame, setNeedleFrame] = useState(0);
  const [isPink, setIsPink] = useState(theme === 'pink');
  const [swapping, setSwapping] = useState(false);
  const [needleLifted, setNeedleLifted] = useState(false);
  const [needleChangeFrame, setNeedleChangeFrame] = useState(0);
  const prevTrackTitle = useRef(null);

  // Drag states
  const [dragging, setDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState(null);
  const [volumeDragging, setVolumeDragging] = useState(false);
  const [volumeHovered, setVolumeHovered] = useState(false);
  const [starHovered, setStarHovered] = useState(false);

  const seekRef = useRef(null);
  const volumeBarRef = useRef(null);

  const currentFrames = isPink ? assets.recordFramesA : assets.recordFramesB;
  const incomingFrames = isPink ? assets.recordFramesB : assets.recordFramesA;

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Spinning record animation while playing
  useEffect(() => {
    if (!isPlaying || swapping) return;
    const interval = setInterval(() => {
      setRecordFrame((f) => (f + 1) % currentFrames.length);
      setNeedleFrame((f) => (f + 1) % assets.needlePlayFrames.length);
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying, swapping, currentFrames.length]);

  // Track change record swap animation trigger
  useEffect(() => {
    if (!track || track.title === 'No track') return;
    if (prevTrackTitle.current === track.title) return;
    
    const wasInitial = prevTrackTitle.current === null;
    prevTrackTitle.current = track.title;
    
    if (wasInitial) return;
    if (needleLifted) return;

    setNeedleLifted(true);
    setNeedleChangeFrame(0);

    // Sequence: Needle lifts (0->1->2) -> records swap -> color changes -> needle lowers (2->1->0)
    setTimeout(() => setNeedleChangeFrame(1), 150);
    setTimeout(() => setNeedleChangeFrame(2), 300);
    setTimeout(() => setSwapping(true), 400);

    setTimeout(() => {
      setIsPink((p) => !p);
      setRecordFrame(0);
      setSwapping(false);
    }, 1000);

    setTimeout(() => setNeedleChangeFrame(1), 1100);
    setTimeout(() => {
      setNeedleChangeFrame(0);
      setNeedleLifted(false);
      setNeedleFrame(0);
    }, 1250);

  }, [track.title, needleLifted]);

  // Drag seek handlers
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e) => {
      if (!seekRef.current) return;
      const rect = seekRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHoverProgress(pct);
      seek(pct);
    };
    const onMouseUp = () => {
      setDragging(false);
      setStarHovered(false);
      setHoverProgress(null);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [dragging, seek]);

  // Drag volume handlers
  useEffect(() => {
    if (!volumeDragging) return;
    const onMouseMove = (e) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const pct = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      setVolume(pct);
    };
    const onMouseUp = () => {
      setVolumeDragging(false);
      setVolumeHovered(false);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [volumeDragging, setVolume]);

  // Handle YouTube song submission
  const handleAddYoutube = async (e) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;

    setYtError('');
    setIsResolvingYt(true);

    try {
      // 1. Extract video ID
      let videoId = youtubeInput.trim();
      const match = videoId.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];

      if (videoId.length !== 11) {
        throw new Error('Formato link non valido. Incolla un link YouTube valido.');
      }

      // 2. Query Piped for video metadata (ad-free)
      const data = await resolveYoutubeStream(videoId);

      const newSong = {
        id: `yt-${videoId}`,
        title: data.title,
        artist: data.uploader || 'YouTube Stream',
        art: data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        videoId: videoId,
        source: 'youtube'
      };

      // 3. Save to IndexedDB (takes negligible storage)
      await addSong(newSong);

      // 4. Update parent playlist state and UI
      onPlaylistUpdated();
      setYoutubeInput('');
      setYtError('Canzone aggiunta con successo! 💖');
      setTimeout(() => setYtError(''), 3000);
    } catch (err) {
      console.error(err);
      setYtError(err.message || 'Errore nel caricamento del video YouTube');
    } finally {
      setIsResolvingYt(false);
    }
  };

  // Handle deleting a custom song
  const handleDeleteSong = async (id, indexToDelete) => {
    try {
      await deleteSong(id);
      onPlaylistUpdated();
      
      // Adjust playing track index if needed
      if (trackIndex >= allTracks.length - 1 && trackIndex > 0) {
        setTrackIndex(trackIndex - 1);
      }
    } catch (err) {
      console.error('Failed to delete song:', err);
    }
  };

  return (
    <div className={`player ${theme === 'blue' ? 'theme-blue' : ''}`}>
      {/* ── Background frame layers ── */}
      <img src={assets.frame} className="layer" alt="" draggable={false} />

      {/* Decorative Title */}
      <div className="window-title">Anamaria Player 💖</div>

      {/* Record player body & record disc */}
      <img src={assets.recordPlayer} className="record-player" alt="" draggable={false} />
      <img
        key={isPink ? "pink-record" : "blue-record"}
        src={currentFrames[recordFrame]}
        className={`record-player ${swapping ? 'record-slide-out' : ''}`}
        alt=""
        draggable={false}
      />
      {swapping && (
        <img
          key={isPink ? "blue-record" : "pink-record"}
          src={incomingFrames[0]}
          className="record-player record-slide-in"
          alt=""
          draggable={false}
        />
      )}
      
      {/* Needle arm */}
      <img
        src={needleLifted ? assets.needleChangeFrames[needleChangeFrame] : assets.needlePlayFrames[needleFrame]}
        className="record-player"
        alt=""
        draggable={false}
      />

      {/* Frame overlays to clip sliding records */}
      <img src={assets.frameNoBg} className="layer frame-overlay" alt="" draggable={false} />

      {/* Plant decoration overlay */}
      <img src={assets.plant} className="layer layer-ui" alt="" draggable={false} />

      {/* ── Progress bar layers ── */}
      <img src={assets.progressBar} className="layer layer-ui" alt="" draggable={false} />
      
      {/* Progress stars path clipping */}
      <img
        src={progressBarStars}
        className="layer layer-ui"
        alt=""
        draggable={false}
        style={{
          clipPath: `inset(0 ${(1 - (131 + (hoverProgress ?? progress) * 226 + 10) / 512) * 100}% 0 0)`,
        }}
      />
      
      {/* Interactive star slider knob */}
      <img
        src={starHovered ? starSelectedImg : starImg}
        className={`layer layer-ui star-indicator ${starHovered ? 'star-hovered' : ''}`}
        alt=""
        draggable={false}
        style={{
          transform: `translateX(calc(-3 / 306 * var(--player-width) + ${(hoverProgress ?? progress) * (226 / 512) * 171.9}vw))`,
        }}
      />

      {/* ── Playback buttons layout (overlay frames) ── */}
      <img src={assets.backwardsButton} className="layer layer-ui" alt="" draggable={false} />
      <img src={isPlaying ? assets.pauseButton : assets.playButton} className="layer layer-ui" alt="" draggable={false} />
      <img src={assets.forwardsButton} className="layer layer-ui" alt="" draggable={false} />

      {/* Volume and Settings buttons overlays */}
      <img
        src={muted ? assets.muteButton : assets.volumeButton}
        className="layer layer-ui"
        alt=""
        draggable={false}
        style={{ opacity: 0.9 }}
      />
      <img src={assets.settings} className="layer layer-ui settings-layer" alt="" draggable={false} />

      {/* ── Album Frame Artwork ── */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="album-mask" clipPathUnits="objectBoundingBox">
            <rect x="0.073" y="0" width="0.853" height="1" />
            <rect x="0.048" y="0.024" width="0.902" height="0.951" />
            <rect x="0.024" y="0.048" width="0.951" height="0.902" />
            <rect x="0" y="0.073" width="1" height="0.853" />
          </clipPath>
        </defs>
      </svg>

      {track.art && (
        <div className="album-mask">
          <img src={track.art} className="album-art" alt="" draggable={false} />
        </div>
      )}
      <img src={assets.albumFrame} className="layer album-frame-layer" alt="" draggable={false} />

      {/* ── Now Playing & Envelope Text ── */}
      <div className="now-playing">
        <div className="track-info">
          <div className="now-playing-label-container">
            <span className="now-playing-label">
              {isLoading ? 'caricamento...' : 'ora in riproduzione...'}
            </span>
            {/* Love letter click trigger */}
            {track.title !== 'No track' && (
              <button className="love-letter-btn blink-text" onClick={() => setShowLoveLetter(true)} title="Apri dedica">
                💌
              </button>
            )}
          </div>
          
          <div className="marquee-container">
            <span className="track-title marquee-scroll">
              {track.title}
              <span className="marquee-gap">{track.title}</span>
            </span>
          </div>
          <div className="track-artist">da {track.artist || 'Cristiano'}</div>
        </div>
      </div>

      {/* Time Display */}
      <div className="time-display">
        <span className="time-current">{formatTime(currentTime)}</span>
        <span className="time-remaining">-{formatTime(duration - currentTime)}</span>
      </div>

      {/* ── INTERACTIVE TOUCH/CLICK HOTSPOTS (Transparent Targets) ── */}

      {/* Seek bar trigger */}
      <div
        className="progress-seek"
        ref={seekRef}
        onMouseEnter={() => setStarHovered(true)}
        onMouseLeave={() => { if (!dragging) setStarHovered(false); }}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setHoverProgress(pct);
          seek(pct);
        }}
        onTouchStart={(e) => {
          setDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const clientX = e.touches[0].clientX;
          const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          setHoverProgress(pct);
          seek(pct);
        }}
      />

      {/* Player playback buttons hot areas */}
      <div className="btn btn-prev" onClick={prev} />
      <div className="btn btn-play" onClick={togglePlay} />
      <div className="btn btn-next" onClick={next} />

      {/* Settings open button */}
      <div className="btn btn-settings" onClick={() => setShowSettings((v) => !v)} />

      {/* Volume hover & drag controller */}
      {(volumeHovered || volumeDragging) && (
        <>
          <img src={assets.volumeBarLow} className="layer layer-ui volume-bar-layer" alt="" draggable={false} />
          <img
            src={assets.volumeBarHigh}
            className="layer layer-ui volume-bar-layer"
            alt=""
            draggable={false}
            style={{
              clipPath: `inset(${((1 - (muted ? 0 : volume)) * (420 - 338) / 512 + 338 / 512) * 100}% 0 0 0)`,
            }}
          />
        </>
      )}

      <div
        className={`volume-hover-zone ${(volumeHovered || volumeDragging) ? 'expanded' : ''}`}
        onMouseLeave={() => { if (!volumeDragging) setVolumeHovered(false); }}
      >
        <div
          className="btn-volume-icon"
          onClick={toggleMute}
          onMouseEnter={() => setVolumeHovered(true)}
        />
        {(volumeHovered || volumeDragging) && (
          <div
            className="volume-bar-area"
            ref={volumeBarRef}
            onMouseDown={(e) => {
              e.preventDefault();
              setVolumeDragging(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
              setVolume(pct);
            }}
            onTouchStart={(e) => {
              setVolumeDragging(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, 1 - (e.touches[0].clientY - rect.top) / rect.height));
              setVolume(pct);
            }}
          />
        )}
      </div>

      {/* ── Settings retro dashboard ── */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-panel-inner">
            
            {/* Theme section */}
            <div className="settings-label">TEMA</div>
            <div className="settings-theme-row">
              <button
                className={`settings-theme-btn ${theme === 'pink' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'pink') toggleTheme(); }}
              >
                rosa
              </button>
              <button
                className={`settings-theme-btn ${theme === 'blue' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'blue') toggleTheme(); }}
              >
                azzurro
              </button>
            </div>

            {/* YouTube Adding Panel */}
            <div className="settings-label" style={{ marginTop: '8px' }}>AGGIUNGI DA YOUTUBE 🎥</div>
            <form onSubmit={handleAddYoutube} className="settings-yt-form">
              <input
                type="text"
                className="settings-input"
                placeholder="Incolla link YouTube..."
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                disabled={isResolvingYt}
              />
              <button type="submit" className="settings-theme-btn yt-add-btn" disabled={isResolvingYt}>
                {isResolvingYt ? '...' : '+'}
              </button>
            </form>
            {ytError && <div className="settings-error">{ytError}</div>}

            {/* Song manager list */}
            <div className="settings-label" style={{ marginTop: '8px' }}>PLAYLIST ({allTracks.length})</div>
            <div className="settings-playlist-list scrollbar-custom">
              {allTracks.map((t, idx) => (
                <div key={t.id} className={`playlist-item-row ${trackIndex === idx ? 'active-track' : ''}`}>
                  <button
                    className="settings-playlist-item"
                    onClick={() => {
                      setTrackIndex(idx);
                      setShowSettings(false);
                    }}
                  >
                    {t.title}
                  </button>
                  {t.source === 'youtube' && (
                    <button
                      className="playlist-item-delete"
                      onClick={() => handleDeleteSong(t.id, idx)}
                      title="Rimuovi"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ── Love Letter Message Overlay ── */}
      {showLoveLetter && (
        <GiftMessage
          track={track}
          onClose={() => setShowLoveLetter(false)}
        />
      )}
    </div>
  );
}
