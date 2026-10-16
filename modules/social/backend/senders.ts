// How a post leaves the server, one sender a platform. Only the test sender exists: it records the post it was
// given and sends nothing, so no real account is touched. A real sender (the Facebook Graph API, Instagram's publishing
// API, WeChat's freepublish) is added here only after the owner has authorised that platform's account, and
// only after the owner has seen sample posts (公司手册 决定记录 L412).
import type { Platform } from "./compose.ts";

export interface Outgoing {
  id: number;
  platform: Platform;
  title: string;
  body: string;
  image_url: string | null;
  link: string;
}

export interface Sender {
  /** Throws when the platform did not take the post. `delivery` says where it went. */
  send(post: Outgoing): Promise<{ delivery: string }>;
}

const test: Sender = {
  async send() { return { delivery: "test" }; },
};

export const senderFor = (_platform: Platform): Sender => test;
