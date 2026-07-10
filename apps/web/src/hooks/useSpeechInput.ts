import { useCallback, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(onResult: (text: string) => void, onStatus?: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const toggle = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      onStatus?.('当前浏览器不支持语音，请手动输入');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      onStatus?.('语音输入已停止');
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) onResult(text);
      setListening(false);
      onStatus?.('语音识别完成');
    };

    rec.onerror = () => {
      setListening(false);
      onStatus?.('语音识别失败');
    };

    rec.onend = () => {
      setListening(false);
    };

    setListening(true);
    onStatus?.('正在聆听…');
    rec.start();
  }, [listening, onResult, onStatus]);

  return { listening, toggle };
}
