"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Minus } from "lucide-react";

export function ChatWidget() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");

  // Show the minimized chat bubble after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Expanded Chat Panel */}
      {expanded && (
        <div className="w-[340px] sm:w-[380px] rounded-xl border shadow-2xl bg-card overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Chat Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Equipment Specialist</p>
                <p className="text-xs opacity-80">Online Now</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors"
                aria-label="Minimize chat"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setExpanded(false); setVisible(false); }}
                className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="h-[300px] p-4 overflow-y-auto bg-muted/30">
            {/* Welcome message */}
            <div className="flex gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-card border rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                <p className="text-sm">
                  Hi there! I&apos;m an equipment specialist at The Heat Pump Ranch.
                  How can I help you today?
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  I can help with system selection, sizing, compatibility
                  questions, and more.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="space-y-2 ml-9">
              <QuickAction text="Help me choose a system" />
              <QuickAction text="I need a quote for a project" />
              <QuickAction text="Question about an existing order" />
              <QuickAction text="Technical / compatibility question" />
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (message.trim()) {
                  // In production, this would send to a chat backend
                  window.open(
                    `mailto:orders@heatpumpranch.com?subject=Chat Inquiry&body=${encodeURIComponent(message)}`,
                    "_blank"
                  );
                  setMessage("");
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Or call us: <a href="tel:+16088309224" className="underline">608-830-9224</a>
            </p>
          </div>
        </div>
      )}

      {/* Minimized Chat Bubble */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="group flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-4 pr-5 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          aria-label="Chat with an equipment specialist"
        >
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
          </div>
          <span className="text-sm font-medium hidden sm:inline">
            Chat with a Specialist
          </span>
          <span className="text-sm font-medium sm:hidden">Chat</span>
        </button>
      )}
    </div>
  );
}

function QuickAction({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(
          `mailto:orders@heatpumpranch.com?subject=${encodeURIComponent(text)}`,
          "_blank"
        );
      }}
      className="block w-full text-left text-xs border rounded-lg px-3 py-2 hover:bg-primary/5 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
    >
      {text}
    </button>
  );
}
