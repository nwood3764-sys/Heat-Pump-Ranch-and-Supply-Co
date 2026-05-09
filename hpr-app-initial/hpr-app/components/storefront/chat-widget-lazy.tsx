"use client";

import dynamic from "next/dynamic";

// Lazy-load the chat widget — it's not needed until 5s after page load anyway.
// This removes ~5KB of client JS from the critical initial bundle.
const ChatWidgetInner = dynamic(
  () => import("@/components/storefront/chat-widget").then((m) => ({ default: m.ChatWidget })),
  { ssr: false }
);

export function ChatWidgetLazy() {
  return <ChatWidgetInner />;
}
