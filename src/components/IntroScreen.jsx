import React, { useState } from 'react';

export default function IntroScreen({ onUnlock }) {
  const [isOpening, setIsOpening] = useState(false);
  const [hearts, setHearts] = useState([]);

  const handleUnlock = () => {
    if (isOpening) return;
    setIsOpening(true);

    // 1. Critical iOS Web Audio Unlock: Play a silent/sweet synthesizer chord 
    // to bypass the browser's audio autoplay restrictions before starting the app.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Sweet high-pitched retro arcade bubble pop sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (err) {
      console.warn('AudioContext pre-unlock failed:', err);
    }

    // 2. Generate multiple retro floating pixel hearts on click
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 80 + 10, // random percentage X
      y: Math.random() * 30 + 50, // random percentage Y
      size: Math.random() * 20 + 10, // size in pixels
      delay: Math.random() * 0.4,
      duration: Math.random() * 1.2 + 0.8
    }));
    setHearts(newHearts);

    // 3. Complete transition after animation ends
    setTimeout(() => {
      onUnlock();
    }, 1800);
  };

  return (
    <div className={`intro-container ${isOpening ? 'fade-out' : ''}`}>
      <div className="intro-card">
        <h1 className="intro-title">CUPID PLAYER</h1>
        
        <div className={`intro-heart-envelope ${isOpening ? 'open-animation' : ''}`} onClick={handleUnlock}>
          <div className="pixel-heart-btn">❤️</div>
        </div>

        <div className="intro-subtitle blink-text" onClick={handleUnlock}>
          Hai una consegna speciale per Anamaria...<br />
          <span>Clicca il cuore per aprirla</span>
        </div>
      </div>

      {/* Floating Retro Heart Animation Overlay */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="floating-pixel-heart"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            fontSize: `${h.size}px`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}
