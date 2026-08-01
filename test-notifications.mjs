// Test script to verify notification data in Firestore
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  let val = trimmed.substring(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  envVars[key] = val;
}

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
      privateKey: envVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function test() {
  console.log('\n=== RECENT BROADCASTS (last 5) ===');
  const broadcasts = await db.collection('broadcasts').orderBy('createdAt', 'desc').limit(5).get();
  if (broadcasts.empty) {
    console.log('  (none found)');
  } else {
    broadcasts.forEach(doc => {
      const d = doc.data();
      console.log(`  ID: ${doc.id}`);
      console.log(`    type: "${d.type}", title: "${d.title}"`);
      console.log(`    customerUid: "${d.customerUid || '(none)'}"`);
      console.log(`    message: ${d.message?.substring(0, 80)}...`);
      console.log(`    createdAt: ${d.createdAt}`);
      console.log('');
    });
  }

  console.log('\n=== RECENT NOTIFICATIONS (last 5) ===');
  const notifs = await db.collection('notifications').orderBy('createdAt', 'desc').limit(5).get();
  if (notifs.empty) {
    console.log('  (none found)');
  } else {
    notifs.forEach(doc => {
      const d = doc.data();
      console.log(`  ID: ${doc.id}`);
      console.log(`    type: "${d.type}", title: "${d.title}"`);
      console.log(`    vendorEmail: "${d.vendorEmail || '(none/global)'}"`);
      console.log(`    adminRoute: "${d.adminRoute || '(none)'}"`);
      console.log(`    createdAt: ${d.createdAt}`);
      console.log('');
    });
  }

  console.log('\n=== RECENT ORDERS (last 2) ===');
  const orders = await db.collection('orders').orderBy('createdAt', 'desc').limit(2).get();
  if (orders.empty) {
    console.log('  (none found)');
  } else {
    orders.forEach(doc => {
      const d = doc.data();
      console.log(`  ID: ${doc.id}`);
      console.log(`    userId: "${d.userId || '(none)'}"`);
      console.log(`    email: "${d.email}"`);
      console.log(`    delivered: ${d.delivered}`);
      console.log(`    items: ${d.items?.map(i => `${i.name} (vendor: ${i.vendor || 'CEO/no-vendor'})`).join(', ')}`);
      console.log(`    createdAt: ${d.createdAt}`);
      console.log('');
    });
  }

  // Check admins to understand who is VIP vs regular
  console.log('\n=== ALL ADMINS ===');
  const admins = await db.collection('admins').get();
  admins.forEach(doc => {
    const d = doc.data();
    console.log(`  UID: ${doc.id}`);
    console.log(`    email: "${d.email}", role: "${d.role}", vip: ${d.vip || false}`);
    console.log(`    routes: ${d.assignedRoutes?.join(', ') || '(none)'}`);
    console.log(`    specialStore: ${d.specialStore ? JSON.stringify(d.specialStore) : '(none)'}`);
    console.log('');
  });
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
