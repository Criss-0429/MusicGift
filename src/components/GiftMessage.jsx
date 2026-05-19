import React from 'react';

export default function GiftMessage({ track, onClose }) {
  if (!track) return null;

  // Pre-configured sweet messages from Cristian for default songs.
  // The user can customize these directly!
  const getCustomMessage = (title) => {
    const t = title.toLowerCase();
    if (t.includes('never gonna give you up')) {
      return "Anamaria, questa è la nostra canzone speciale! Un classico intramontabile che mi ricorderà per sempre quanto sono fortunato ad averti al mio fianco. Non ti lascerò mai! ❤️";
    }
    if (t.includes('perfect') || t.includes('edsheeran')) {
      return "Sei perfetta, Anamaria, in ogni singolo dettaglio. Quando ascolto questa canzone penso alla tua dolcezza, al tuo sorriso che illumina le mie giornate e a come tutto sia semplicemente perfetto quando sono con te. 💕";
    }
    if (t.includes('love') || t.includes('amore')) {
      return "Tutto il mio amore è per te. Questa melodia è un piccolo pezzo del mio cuore che batte forte ogni volta che sento la tua voce. Ti amo immensamente! 🌸";
    }
    
    // Fallback cute default message if she uploaded her own YouTube song
    return track.personalMessage || `Hai aggiunto questa fantastica canzone, Anamaria! Ascoltiamola insieme, ogni nota mi fa pensare a te e a quanto ti amo. 💖`;
  };

  const messageText = getCustomMessage(track.title);

  return (
    <div className="letter-overlay">
      <div className="letter-container">
        {/* Envelope stamp decoration */}
        <div className="letter-stamp">💌</div>
        
        <h2 className="letter-title">Per Anamaria ❤️</h2>
        
        <div className="letter-content scrollbar-custom">
          <p className="letter-body">
            {messageText}
          </p>
          
          {track.lyrics && (
            <div className="letter-lyrics">
              <div className="lyrics-divider">
                <span>✦ LYRICS ✦</span>
              </div>
              <pre className="lyrics-text">{track.lyrics}</pre>
            </div>
          )}
        </div>

        <button className="letter-close-btn" onClick={onClose}>
          Con tutto il mio cuore
        </button>
      </div>
    </div>
  );
}
