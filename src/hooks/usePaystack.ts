'use client';

import { useCallback, useEffect } from 'react';

interface PaystackConfig {
  reference: string;
  email: string;
  amount: number; // in kobo
  publicKey: string;
  onSuccess: (reference: any) => void;
  onClose: () => void;
}

/**
 * Custom Paystack hook that loads the Paystack inline script dynamically.
 * This avoids the "window is not defined" SSR error from react-paystack.
 */
export function usePaystack() {
  useEffect(() => {
    const existingScript = document.getElementById('paystack-inline-js');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'paystack-inline-js';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);
  const pay = useCallback((config: PaystackConfig) => {
    // Dynamically load Paystack inline script if not already loaded
    const existingScript = document.getElementById('paystack-inline-js');

    const initiate = () => {
      // @ts-ignore
      if (typeof window.PaystackPop === 'undefined') {
        setTimeout(initiate, 100);
        return;
      }

      // @ts-ignore — PaystackPop is injected by the Paystack script
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount,
        ref: config.reference,
        callback: (response: any) => {
          config.onSuccess(response);
        },
        onClose: () => {
          config.onClose();
        },
      });
      handler.openIframe();
    };

    if (existingScript) {
      initiate();
    } else {
      const script = document.createElement('script');
      script.id = 'paystack-inline-js';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        initiate();
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
      };
      document.head.appendChild(script);
    }
  }, []);

  return pay;
}
