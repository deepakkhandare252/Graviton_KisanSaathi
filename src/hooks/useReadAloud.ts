import { useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const SPEECH_CHUNK_LIMIT = 550;

const splitSpeechText = (text: string): string[] => {
  const chunks: string[] = [];
  let chunk = '';

  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue;

    if (chunk && chunk.length + word.length + 1 > SPEECH_CHUNK_LIMIT) {
      chunks.push(chunk);
      chunk = word;
    } else {
      chunk = chunk ? `${chunk} ${word}` : word;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
};

export const useReadAloud = () => {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const hasWarnedAboutVoiceFallback = useRef(false);
  const hasReportedUnavailable = useRef(false);
  const speechRequestId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const finishPlaybackRef = useRef<(() => void) | null>(null);

  const cancelCurrentPlayback = useCallback(() => {
    audioRef.current?.pause();
    finishPlaybackRef.current?.();
    finishPlaybackRef.current = null;
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(
    () => () => {
      speechRequestId.current += 1;
      cancelCurrentPlayback();
    },
    [cancelCurrentPlayback]
  );

  const playLocalAudio = (audioUrl: string, requestId: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
      let isFinished = false;

      const finish = (error?: unknown) => {
        if (isFinished) return;
        isFinished = true;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        if (audioRef.current === audio) audioRef.current = null;
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
        }
        if (finishPlaybackRef.current === finishPlayback) {
          finishPlaybackRef.current = null;
        }
        if (error) reject(error);
        else resolve();
      };

      const onEnded = () => finish();
      const onError = () => finish(new Error('Local speech audio could not be played.'));
      const finishPlayback = () => finish();

      finishPlaybackRef.current = finishPlayback;
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.play().catch(onError);

      if (requestId !== speechRequestId.current) finish();
    });

  const playBrowserSpeech = (text: string, requestId: number): Promise<void> =>
    new Promise((resolve) => {
      const browserSpeech = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      const languageCode = language === 'kn' ? 'kn' : 'en';
      const genderPattern =
        language === 'kn'
          ? /\b(female|woman|feminine|nandini|kavya|sowmya|soumy[a]?)\b/i
          : /\b(male|man|masculine|david|mark|guy|james|daniel|rishi)\b/i;
      const languageVoices = browserSpeech
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().split('-')[0] === languageCode);
      const preferredVoice = languageVoices.find((voice) =>
        genderPattern.test(`${voice.name} ${voice.voiceURI}`)
      );
      utterance.lang = language === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.voice = preferredVoice ?? languageVoices[0] ?? null;

      let isFinished = false;
      const finish = () => {
        if (isFinished) return;
        isFinished = true;
        utterance.onend = null;
        utterance.onerror = null;
        if (finishPlaybackRef.current === finish) finishPlaybackRef.current = null;
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      finishPlaybackRef.current = finish;
      browserSpeech.speak(utterance);

      if (requestId !== speechRequestId.current) finish();
    });

  const speakText = useCallback(
    async (text: string) => {
      const chunks = splitSpeechText(text);
      if (chunks.length === 0) return;

      const requestId = ++speechRequestId.current;
      cancelCurrentPlayback();
      let useBrowserFallback = false;

      for (const chunk of chunks) {
        if (requestId !== speechRequestId.current) return;

        if (!useBrowserFallback) {
          try {
            const response = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: chunk, language })
            });
            if (!response.ok) {
              throw new Error(`Local speech service returned ${response.status}`);
            }

            const audioUrl = URL.createObjectURL(await response.blob());
            if (requestId !== speechRequestId.current) {
              URL.revokeObjectURL(audioUrl);
              return;
            }
            await playLocalAudio(audioUrl, requestId);
            continue;
          } catch (error) {
            if (requestId !== speechRequestId.current) return;
            console.error('Local read-aloud failed:', error);
            cancelCurrentPlayback();
            useBrowserFallback = true;
          }
        }

        if (!('speechSynthesis' in window)) {
          if (!hasReportedUnavailable.current) {
            hasReportedUnavailable.current = true;
            showToast({
              variant: 'error',
              title: language === 'kn' ? 'ಧ್ವನಿ ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ' : 'Speech unavailable',
              description:
                language === 'kn'
                  ? 'ಸ್ಥಳೀಯ ಮತ್ತು ಸಾಧನದ ಧ್ವನಿ ಸೇವೆಗಳು ಲಭ್ಯವಿಲ್ಲ.'
                  : 'Neither local nor device speech is available.'
            });
          }
          return;
        }

        if (useBrowserFallback && !hasWarnedAboutVoiceFallback.current) {
          hasWarnedAboutVoiceFallback.current = true;
          showToast({
            variant: 'info',
            title: language === 'kn' ? 'ಸ್ಥಳೀಯ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ' : 'Offline voice unavailable',
            description:
              language === 'kn'
                ? 'ಸ್ಥಳೀಯ ಧ್ವನಿ ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ. ಸಾಧನದ ಧ್ವನಿಯನ್ನು ಬಳಸಲಾಗುತ್ತಿದೆ.'
                : 'The local voice service is unavailable. Using the device voice instead.'
          });
        }

        await playBrowserSpeech(chunk, requestId);
      }
    },
    [cancelCurrentPlayback, language, showToast]
  );

  return { speakText };
};
