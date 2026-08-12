'use client';

import { useEffect, useRef, useState } from 'react';
import { AttachIcon, CloseIcon, MicIcon, SendIcon, StopIcon } from './icons';

interface ComposerProps {
  onSendText: (text: string) => void;
  onSendMedia: (file: File) => void;
  onSendVoice: (blob: Blob) => void;
  onTypingChange?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Composer({
  onSendText,
  onSendMedia,
  onSendVoice,
  onTypingChange,
  placeholder = 'Message Atharv Intelligence…',
  disabled,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fireTyping(isTyping: boolean) {
    if (!onTypingChange) return;
    onTypingChange(isTyping);
    if (isTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => onTypingChange(false), 2500);
    }
  }

  function handleTextChange(value: string) {
    setText(value);
    fireTyping(value.length > 0);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    }
  }

  function sendText() {
    const value = text.trim();
    if (!value || disabled) return;
    onSendText(value);
    setText('');
    fireTyping(false);
    const el = textareaRef.current;
    if (el) el.style.height = 'auto';
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  }

  function sendImage() {
    if (!image || disabled) return;
    onSendMedia(image.file);
    URL.revokeObjectURL(image.url);
    setImage(null);
  }

  function cancelImage() {
    if (!image) return;
    URL.revokeObjectURL(image.url);
    setImage(null);
  }

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) =>
          MediaRecorder.isTypeSupported(m),
        ) ?? '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];
        const cancelled = (rec as MediaRecorder & { cancelled?: boolean }).cancelled;
        if (rec.state === 'inactive' && !cancelled) onSendVoice(blob);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setMicError('Microphone access is blocked or unavailable.');
    }
  }

  function stopRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  function cancelRecording() {
    const rec = mediaRecorderRef.current;
    if (rec) {
      (rec as MediaRecorder & { cancelled?: boolean }).cancelled = true;
      if (rec.state !== 'inactive') rec.stop();
    }
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    },
    [],
  );

  const fmt = `${String(Math.floor(recSeconds / 60)).padStart(2, '0')}:${String(
    recSeconds % 60,
  ).padStart(2, '0')}`;

  return (
    <div className="w-full">
      {micError && (
        <p className="mb-2 px-1 font-mono text-xs text-red-400">{micError}</p>
      )}

      {image && (
        <div className="glass mb-2 flex animate-fade-up items-center gap-3 rounded-xl p-2">
          <img src={image.url} alt="Preview" className="h-14 w-14 rounded-lg border border-line object-cover" />
          <span className="flex-1 truncate font-mono text-xs text-slate-400">
            {image.file.name}
          </span>
          <button
            type="button"
            onClick={cancelImage}
            className="rounded-lg border border-line p-2 text-slate-400 transition hover:text-slate-200"
            aria-label="Cancel image"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={sendImage}
            disabled={disabled}
            className="rounded-lg bg-accent p-2 text-white transition hover:bg-accent-bright disabled:opacity-50"
            aria-label="Send image"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="glass-strong flex animate-fade-up items-center gap-3 rounded-2xl p-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-sm tabular-nums text-red-300">{fmt}</span>
          <span className="flex-1 truncate font-mono text-xs uppercase tracking-widest text-slate-500">
            recording voice note
          </span>
          <button
            type="button"
            onClick={cancelRecording}
            className="rounded-lg border border-line p-2 text-slate-400 transition hover:text-slate-200"
            aria-label="Cancel recording"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-red-500 p-2 text-white transition hover:bg-red-400"
            aria-label="Stop recording"
          >
            <StopIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="glass flex items-end gap-2 rounded-2xl p-2.5 transition focus-within:border-accent/40 focus-within:shadow-glow">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="shrink-0 rounded-xl border border-line p-2.5 text-slate-400 transition hover:text-accent-bright disabled:opacity-50"
            aria-label="Attach image"
          >
            <AttachIcon className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="max-h-[132px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="shrink-0 rounded-xl border border-line p-2.5 text-slate-400 transition hover:text-mag disabled:opacity-50"
            aria-label="Record voice note"
          >
            <MicIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={sendText}
            disabled={disabled || !text.trim()}
            className="shrink-0 rounded-xl bg-accent p-2.5 text-white shadow-glow transition hover:bg-accent-bright disabled:opacity-40 disabled:shadow-none"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
