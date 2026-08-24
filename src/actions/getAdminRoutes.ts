'use server';

import fs from 'fs';
import path from 'path';

export async function getAdminRoutes() {
  try {
    const adminPath = path.join(process.cwd(), 'src', 'app', 'admin');
    const entries = fs.readdirSync(adminPath, { withFileTypes: true });
    const routes = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('[') && !entry.name.startsWith('('))
      .map(dir => `/ADMIN/${dir.name.toUpperCase()}`);
    
    // Always include dashboard
    if (!routes.includes('/ADMIN/MANAGEMENT')) {
        routes.unshift('/ADMIN/MANAGEMENT');
    }
    return routes;
  } catch (error) {
    console.error('Failed to read admin routes:', error);
    return [];
  }
}
