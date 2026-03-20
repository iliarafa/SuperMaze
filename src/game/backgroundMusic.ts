import { getSettings } from './settings';

let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/maze_sounds1.mp3');
    audio.loop = true;
    audio.volume = 0.3;
  }
  return audio;
}

function isPlaying(): boolean {
  return !!audio && !audio.paused;
}

export function startBackgroundMusic(): void {
  if (!getSettings().soundEnabled) return;
  if (isPlaying()) return;
  getAudio().play().catch(() => {});
}

export function resumeBackgroundMusic(): void {
  if (!getSettings().soundEnabled) return;
  if (isPlaying()) return;
  getAudio().play().catch(() => {});
}

export function pauseBackgroundMusic(): void {
  if (audio) audio.pause();
}

export function syncBackgroundMusic(soundEnabled: boolean): void {
  if (soundEnabled) {
    if (isPlaying()) return;
    getAudio().play().catch(() => {});
  } else {
    pauseBackgroundMusic();
  }
}
