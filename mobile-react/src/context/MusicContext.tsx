import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Sound from 'react-native-sound';
import { storage } from '../utils/storage';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

interface MusicContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false); // Default false, but we'll load from storage
  const [isLoaded, setIsLoaded] = useState(false);
  const soundRef = useRef<Sound | null>(null);

  // Load saved mute state on mount
  useEffect(() => {
    const loadMuteState = async () => {
      const savedMuted = await storage.getMusicMuted();
      setIsMuted(savedMuted);
      setIsLoaded(true);
    };
    loadMuteState();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Load the sound file
    const sound = new Sound(require('../assets/sounds/THETRIO.mp3'), (error) => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      
      // Configure the sound
      sound.setNumberOfLoops(-1); // Infinite loop
      
      // Set initial volume based on loaded state
      // If muted, volume 0. If not muted, volume 0.2
      const initialVolume = isMuted ? 0 : 0.2;
      sound.setVolume(initialVolume);
      
      // Play immediately
      sound.play((success) => {
        if (!success) {
          console.log('playback failed due to audio decoding errors');
        }
      });
    });
    
    soundRef.current = sound;

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, [isLoaded]); // Only run once loaded state is ready

  // Handle dynamic mute toggling
  useEffect(() => {
    if (soundRef.current) {
      if (isMuted) {
        soundRef.current.setVolume(0);
      } else {
        soundRef.current.setVolume(0.2);
      }
    }
  }, [isMuted]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    storage.setMusicMuted(newMuted);
  };

  return (
    <MusicContext.Provider value={{ isMuted, toggleMute }}>
      {children}
    </MusicContext.Provider>
  );
};
