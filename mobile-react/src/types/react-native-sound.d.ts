declare module 'react-native-sound' {
  class Sound {
    static setCategory(
      value: 'Ambient' | 'SoloAmbient' | 'Playback' | 'Record' | 'PlayAndRecord' | 'AudioProcessing' | 'MultiRoute',
      mixWithOthers?: boolean
    ): void;
    static setMode(value: 'Default' | 'VoiceChat' | 'VideoChat' | 'GameChat' | 'VideoRecording' | 'Measurement' | 'MoviePlayback' | 'SpokenAudio'): void;
    static setActive(value: boolean): void;
    static setSpeakerPhone(value: boolean): void;
    static MAIN_BUNDLE: string;
    static DOCUMENT: string;
    static LIBRARY: string;
    static CACHES: string;

    constructor(filename: string, basePath: string | ((error: any, props: any) => void), callback?: (error: any, props: any) => void);

    isLoaded(): boolean;
    play(onEnd?: (success: boolean) => void): void;
    pause(callback?: () => void): void;
    stop(callback?: () => void): void;
    release(): void;
    setVolume(value: number): void;
    getVolume(): number;
    setPan(value: number): void;
    getPan(): number;
    setNumberOfLoops(value: number): void;
    getNumberOfLoops(): number;
    setSpeed(value: number): void;
    getSpeed(): number;
    getCurrentTime(callback: (seconds: number, isPlaying: boolean) => void): void;
    setCurrentTime(value: number): void;
    getDuration(): number;
  }

  export default Sound;
}
