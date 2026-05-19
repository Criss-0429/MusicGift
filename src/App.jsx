import React, { useState, useEffect, useCallback } from 'react';
import IntroScreen from './components/IntroScreen';
import MusicPlayer from './components/MusicPlayer';
import { getAllSongs } from './db/musicDb';
import './App.css';

// ── Default Curated Gift Tracks ──
// You can replace these files in your `public/audio/` folder!
// Each song can have its custom cover art, lyrics, and romantic personal messages.
const DEFAULT_GIFT_TRACKS = [
  {
    id: 'gift-1',
    title: 'Ed Sheeran - Perfect',
    artist: 'Cristiano per Anamaria',
    file: 'perfect.mp3',
    art: './covers/perfect.svg', // Will be served from public/covers/
    source: 'local',
    personalMessage: 'Perché sei perfetta così come sei, Anamaria. Ogni volta che ascolto questa canzone penso a quanto sono fortunato ad averti nella mia vita. Ti amo infinitamente! ❤️',
    lyrics: `I found a love for me\nDarling, just dive right in and follow my lead\nI found a girl, beautiful and sweet\nI never knew you were the someone waiting for me...\n\nBaby, I'm dancing in the dark\nWith you between my arms\nBarefoot on the grass\nListening to our favorite song\nWhen you said you looked a mess\nI whispered underneath my breath\nBut you heard it\nDarling, you look perfect tonight...`
  },
  {
    id: 'gift-2',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    file: 'never_gonna_give_you_up.mp3',
    art: './covers/never_gonna.svg',
    source: 'local',
    personalMessage: 'La nostra canzone speciale! Un classico intramontabile che mi ricorderà per sempre quanto ridiamo insieme. Non ti lascerò mai! 💖',
    lyrics: `We're no strangers to love\nYou know the rules and so do I\nA full commitment's what I'm thinking of\nYou wouldn't get this from any other guy...\n\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you...`
  },
  {
    id: 'gift-3',
    title: 'Queen - Love of My Life',
    artist: 'Queen (Cristiano per Anamaria)',
    file: 'love_of_my_life.mp3',
    art: './covers/queen.svg',
    source: 'local',
    personalMessage: 'Sei letteralmente l\'amore della mia vita, Anamaria. Niente potrà mai cambiare quello che provo per te. Sei la mia roccia e la mia melodia preferita. 💕',
    lyrics: `Love of my life, you've hurt me\nYou've broken my heart and now you leave me\nLove of my life, can't you see?\nBring it back, bring it back\nDon't take it away from me, because you don't know\nWhat it means to me...`
  }
];

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
