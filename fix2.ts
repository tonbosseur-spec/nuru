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
      
      let newContent = content.replace(/\\{\\\\([a-zA-Z0-9_]+)\\}/g, '{$1}'); // For {\\target} which means {\target}
      newContent = newContent.replace(/\\{\\\\[a-zA-Z0-9_]+/g, '{'); // In case of {\\target
      
      // Let's just fix the exact strings:
      newContent = newContent.replace(/Linear Regression: \\{\\\\y_var\\} ~ \\{\\\\x_var\\}/g, 'Linear Regression: {y_var} ~ {x_var}');
      // Actually easier: Let's read the file and replace any `{\\` with `{`.
      newContent = newContent.replace(/\\{\\\\/g, '{');
      
      if (content !== newContent) {
         fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}

fixDir('./src');
