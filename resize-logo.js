const fs = require('fs');
const path = require('path');

// Check if sharp is installed, if not, provide instructions
try {
  const sharp = require('sharp');
  
  const publicDir = path.join(__dirname, 'public');
  const logoPath = path.join(publicDir, 'logo_pwa.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('Error: logo_pwa.png not found in public folder');
    process.exit(1);
  }
  
  console.log('Resizing logo_pwa.png...');
  
  // Create 192x192 version
  sharp(logoPath)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'logo_pwa_192.png'))
    .then(() => console.log('✓ Created logo_pwa_192.png'))
    .catch(err => console.error('Error creating 192px logo:', err));
  
  // Create 512x512 version
  sharp(logoPath)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'logo_pwa_512.png'))
    .then(() => console.log('✓ Created logo_pwa_512.png'))
    .catch(err => console.error('Error creating 512px logo:', err));
    
} catch (error) {
  console.error('Sharp not installed. Installing it now...');
  require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
}
