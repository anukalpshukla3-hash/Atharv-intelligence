export type MessageKind = 'text' | 'image' | 'voice';
export type Sender = 'visitor' | 'admin';

export interface Message {
  id: string;
  conversation_id: string;
  sender: Sender;
  kind: MessageKind;
  content: string | null;
  media_url: string | null;
  mime_type: string | null;
  created_at: string;
  read_at: string | null;
}

export interface Conversation {
  id: string;
  visitor_id: string;
  visitor_label: string;
  status: 'open' | 'closed'; // 'closed' = archived (admin history)
  last_message_at: string;
  created_at: string;
  updated_at: string;
  unread?: number;
}

export type ChatMessage = Message & {
  temp?: boolean;
  status?: 'sending' | 'sent' | 'error';
};
