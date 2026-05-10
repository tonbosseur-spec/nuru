import fs from 'fs';
import path from 'path';

function fixDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content.replace(/\\\`/g, '\`');
      newContent = newContent.replace(/\\\${/g, '${');
      
      if (content !== newContent) {
         fs.writeFileSync(fullPath, newContent);
         console.log('Fixed:', fullPath);
      }
    }
  }
}

fixDir('./src');
