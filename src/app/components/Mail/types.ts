export interface Message {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  read_status: boolean;
  thread_id: string | null;
}

export type Folder = "inbox" | "sent";
