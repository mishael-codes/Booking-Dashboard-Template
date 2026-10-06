import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  console.error('[SCAN ERROR] dist directory not found. Run build first.');
  process.exit(1);
}

const BANNED_PATTERNS = ['service_role', 'sb_secret', 'SUPABASE_SERVICE_ROLE_KEY'];

let failed = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html') || entry.name.endsWith('.css'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of BANNED_PATTERNS) {
        if (content.includes(pattern)) {
          console.error(`[SECURITY FAILURE] Found forbidden token "${pattern}" in file: ${fullPath}`);
          failed = true;
        }
      }
    }
  }
}

scanDir(distDir);

if (failed) {
  console.error('[SECURITY FAILURE] Secret scan detected forbidden tokens in production build!');
  process.exit(1);
} else {
  console.log('[SECURITY CHECK PASSED] No service_role or sb_secret tokens found in dist/.');
}
