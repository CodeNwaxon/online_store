import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

// Ensure analytics exists before logging
const safeLogEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch (error) {
      console.warn("Analytics error:", error);
    }
  }
};

export const logPageView = (page_path: string) => {
  safeLogEvent("page_view", { page_path });
};

export const logViewItem = (itemData: {
  currency?: string;
  value?: number;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("view_item", itemData);
};

export const logSearch = (search_term: string) => {
  safeLogEvent("search", { search_term });
};

export const logAddToCart = (itemData: {
  currency?: string;
  value?: number;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("add_to_cart", itemData);
};

export const logRemoveFromCart = (itemData: {
  currency?: string;
  value?: number;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("remove_from_cart", itemData);
};

export const logBeginCheckout = (checkoutData: {
  currency?: string;
  value?: number;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("begin_checkout", checkoutData);
};

export const logAddPaymentInfo = (paymentData: {
  currency?: string;
  value?: number;
  payment_type?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("add_payment_info", paymentData);
};

export const logPurchase = (purchaseData: {
  transaction_id: string;
  currency?: string;
  value?: number;
  shipping?: number;
  items: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
}) => {
  safeLogEvent("purchase", purchaseData);
};

export const logShare = (method: string, content_type: string, item_id: string) => {
  safeLogEvent("share", { method, content_type, item_id });
};

export const logCustomEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  safeLogEvent(eventName, eventParams);
};
