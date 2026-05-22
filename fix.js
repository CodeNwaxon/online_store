const fs = require('fs');

['src/app/checkout/page.tsx', 'src/components/InstallmentOverlay.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
});
