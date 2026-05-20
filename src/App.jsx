import React, { useState, useEffect, useCallback } from 'react';
import IntroScreen from './components/IntroScreen';
import MusicPlayer from './components/MusicPlayer';
import { getAllSongs } from './db/musicDb';
import './App.css';

// ── Default Curated Gift Tracks ──
// You can replace these files in your `public/audio/` folder!
// Each song can have its custom cover art, lyrics, and romantic personal messages.
const DEFAULT_GIFT_TRACKS = [];

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [customTracks, setCustomTracks] = useState([]);

  // Load custom tracks from IndexedDB
  const loadCustomTracks = useCallback(async () => {
    try {
      const tracks = await getAllSongs();
      setCustomTracks(tracks);
    } catch (err) {
      console.error('Failed to load custom tracks from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadCustomTracks();
  }, [loadCustomTracks]);

  return (
    <div className="app-root">
      {!isUnlocked ? (
        <IntroScreen onUnlock={() => setIsUnlocked(true)} />
      ) : (
        <div className="player-wrapper">
          <MusicPlayer
            defaultTracks={DEFAULT_GIFT_TRACKS}
            customTracks={customTracks}
            onPlaylistUpdated={loadCustomTracks}
          />
        </div>
      )}
    </div>
  );
}
