import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// This endpoint is meant to be pinged every 5 minutes by a service like UptimeRobot
// to keep the Vercel serverless function warm and avoid cold starts.

export async function GET() {
  try {
    // Optionally perform a fast, lightweight query to keep the database connection warm too
    await adminDb.collection('settings').doc('general').get();
    
    return NextResponse.json({ status: 'warm', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: 'Failed to keep warm' }, { status: 500 });
  }
}
