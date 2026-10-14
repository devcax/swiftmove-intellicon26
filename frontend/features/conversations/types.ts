export interface ApiConversationSummary {
  id: string;
  driverId?: string | null;
  jobId?: string | null;
  driver: string;
  phone: string;
  jobNumber: string;
  lastMessage: string;
  lastActivity: string | null;
  unread: number;
  verified: boolean;
  aiPaused: boolean;
}

export type ApiMessageKind = "DRIVER" | "MANAGER" | "BOT";

export interface ApiInterpretation {
  intent: string;
  confidence: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REQUIRES_REVIEW";
  fields: { label: string; value: string }[];
}

export interface ApiChatAttachment {
  id: string;
  type: string;
  filename: string | null;
  mimeType: string | null;
  publicUrl: string | null;
  createdAt: string;
}

export interface ApiChatMessage {
  id: string;
  kind: ApiMessageKind;
  type?: string;
  text: string;
  time: string;
  deliveryStatus: "RECEIVED" | "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  interpretation?: ApiInterpretation;
  attachments: ApiChatAttachment[];
}

// What the conversations page draws (the API shapes, turned into what a row and a bubble show).
export type MessageKind = "DRIVER" | "MANAGER" | "BOT" | "AI";

export interface AiInterpretation {
  intent: string;
  confidence: number;
  fields: { label: string; value: string }[];
}

export interface ChatAttachment {
  id: string;
  type: string;
  filename: string | null;
  mimeType: string | null;
  publicUrl: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  /** Stable bubble identity while a locally queued reply receives its server id. */
  clientId?: string;
  kind: MessageKind;
  type?: string;
  text: string;
  time: string;
  interpretation?: AiInterpretation;
  deliveryStatus?: "RECEIVED" | "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  attachments?: ChatAttachment[];
}

export interface Conversation {
  id: string;
  driverId?: string | null;
  jobId?: string | null;
  driver: string;
  phone: string;
  jobNumber: string;
  route: string;
  lastMessage: string;
  lastActivity: string;
  unread: number;
  online: boolean;
  verified: boolean;
  aiPaused?: boolean;
  messages: ChatMessage[];
}
