'use client';

import { useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// List of bot, crawler, and uptime monitor signatures
const BOT_USER_AGENTS = /uptimerobot|bot|crawler|spider|pingdom|betteruptime|statuscake|site24x7|headlesschrome|phantomjs|lighthouse|googlebot|bingbot|yandex|baiduspider|duckduckbot/i;

function isBot(): boolean {
  if (typeof window === 'undefined') return true;

  // 1. Detect automated browser runners (Puppeteer, Selenium, headless tests)
  if (navigator.webdriver) return true;

  // 2. Detect User-Agent signatures of uptime monitors, bots, and crawlers
  const ua = navigator.userAgent || '';
  if (BOT_USER_AGENTS.test(ua)) return true;

  // 3. Detect headless browser properties
  const win = window as any;
  if (win._phantom || win.__nightmare || win.callPhantom || win.__selenium_unwrapped) {
    return true;
  }

  return false;
}

export default function VisitorTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Ignore automated uptime monitors, bots, and crawlers
    if (isBot()) {
      return;
    }

    // Capture referral code if present
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('partner_ref_code', refCode);
    }

    const trackVisitor = async () => {
      try {
        // Retrieve or generate a persistent visitor UID for this browser/device
        let visitorUid = localStorage.getItem('visitor_uid');
        let isFirstTimeEver = false;

        if (!visitorUid) {
          visitorUid = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          localStorage.setItem('visitor_uid', visitorUid);
          isFirstTimeEver = true;
        }

        // Determine current month key (e.g. 2026_march)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = MONTH_KEYS[now.getMonth()];
        const monthKey = `${currentYear}_${currentMonth}`;
        const monthlyVisitDocId = `${monthKey}_${visitorUid}`;

        // Check if this original user has already visited in the CURRENT month
        const monthlyVisitRef = doc(db, 'visitor_monthly_visits', monthlyVisitDocId);
        const monthlyVisitDoc = await getDoc(monthlyVisitRef);

        const hasVisitedThisMonth = monthlyVisitDoc.exists();

        // Check all-time first visit record
        const allTimeRef = doc(db, 'visitor_ids', visitorUid);
        if (!isFirstTimeEver) {
          const allTimeDoc = await getDoc(allTimeRef);
          if (!allTimeDoc.exists()) {
            isFirstTimeEver = true;
          }
        }

        // If user already counted for this month and already in all-time, no updates needed
        if (hasVisitedThisMonth && !isFirstTimeEver) {
          return;
        }

        // Record monthly visit for this user if not already recorded
        if (!hasVisitedThisMonth) {
          await setDoc(monthlyVisitRef, {
            visitorUid,
            monthKey,
            year: currentYear,
            month: currentMonth,
            visitedAt: new Date().toISOString(),
          });
        }

        // Record all-time first visit if new visitor
        if (isFirstTimeEver) {
          await setDoc(allTimeRef, {
            firstVisit: new Date().toISOString(),
          });
        }

        // Increment counts: month-specific unique visitor count and/or all-time total
        const updates: Record<string, any> = {};
        if (!hasVisitedThisMonth) {
          updates[monthKey] = increment(1);
        }
        if (isFirstTimeEver) {
          updates.total = increment(1);
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(
            doc(db, 'visitors', 'monthly'),
            updates,
            { merge: true }
          );
        }
      } catch (error) {
        // Silent fail — visitor tracking should never break the app
        console.warn('Visitor tracking error:', error);
      }
    };

    trackVisitor();
  }, []);

  return null;
}
