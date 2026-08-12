export type MessageKind = 'text' | 'image' | 'voice';
export type Sender = 'visitor' | 'admin';
// 'open' = active queue, 'closed' = archived (kept in admin history).
export type ConversationStatus = 'open' | 'closed';

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
  status: ConversationStatus;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  unread?: number;
}

export interface SendPayload {
  kind?: MessageKind;
  content?: string;
  mediaUrl?: string;
  mimeType?: string;
}

export interface AdminUser {
  id: string;
  display_name: string;
}
