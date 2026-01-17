#!/usr/bin/env node
/**
 * Rename .js files to .cjs in the CJS dist folder
 */
import { readdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';

function renameFiles(dir) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      renameFiles(filePath);
    } else if (file.endsWith('.js')) {
      const newPath = filePath.replace(/\.js$/, '.cjs');
      renameSync(filePath, newPath);
    }
  }
}

renameFiles('./dist/cjs');
console.log('Renamed CJS files to .cjs extension');
