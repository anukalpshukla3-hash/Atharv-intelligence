import { ChatApp } from '@/components/ChatApp';
import { AtharvStory } from '@/components/AtharvStory';
import { ChatShortcut } from '@/components/ChatShortcut';

export default function Home() {
  return (
    <main>
      <ChatShortcut />
      <AtharvStory />
      <ChatApp />
    </main>
  );
}

