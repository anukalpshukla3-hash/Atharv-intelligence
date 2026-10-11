'use client';

import { useEffect, useState } from 'react';

export function ChatShortcut() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const chat = document.getElementById('chat');
    if (!chat || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting);
    }, { threshold: 0.18 });
    observer.observe(chat);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;
  return (
    <a className="chat-fab" href="#chat" aria-label="Open the live Atharv chat" title="Open chat">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path d="M4.5 5.5h15v11h-8l-4.5 3v-3h-2.5v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      </svg>
      <span>CHAT</span>
    </a>
  );
}

