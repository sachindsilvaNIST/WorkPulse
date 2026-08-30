"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { type: string; theme: string; size: string; width: number; shape: string }
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
}

/** Renders Google's own "Sign in with Google" button via the GIS script (loaded once in the
 * (auth) layout) into a ref'd div — Google owns the button's markup/styling, so this only wires
 * up the callback rather than building a custom button that POSTs a credential itself. */
export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    let cancelled = false;
    // The GIS script loads async — poll briefly rather than assuming it's ready by mount time.
    function tryInit() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(tryInit, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: (response) => onCredential(response.credential),
      });
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          shape: "pill",
        });
      }
    }
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  if (!clientId) return null;

  return <div ref={containerRef} className="flex w-full justify-center" />;
}
