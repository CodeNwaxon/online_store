'use server';

import crypto from 'crypto';

export async function uploadImageToCloudinary(formData: FormData): Promise<any> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables (CLOUD_NAME, API_KEY, API_SECRET) are missing');
  }

  // Create signature
  const timestamp = Math.round(new Date().getTime() / 1000).toString();
  
  // For signed uploads without an upload_preset, we only need to hash timestamp + api_secret
  const signatureString = `timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  // We can safely remove upload_preset if it exists on formData because it's unsigned by default.
  // Actually, Cloudinary signed uploads don't need upload_preset unless the preset has strict settings, 
  // but if we do use it, it must be included in the signature. To make it strictly secure and simple, 
  // we'll just omit the upload_preset and only use signed auth.
  formData.delete('upload_preset');
  
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Cloudinary upload failed:", errorText);
    throw new Error('Failed to upload image to Cloudinary');
  }

  const data = await res.json();
  return data;
}

export async function deleteImagesFromCloudinary(urls: string[]): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary environment variables missing for deletion.');
    return;
  }

  for (const url of urls) {
    if (!url || typeof url !== 'string') continue;
    try {
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1312461204/folder/sample.jpg
      // This regex captures everything after /upload/ (and optional /v1234/) up to the file extension.
      const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
      const match = url.match(regex);
      if (!match) continue;
      
      const publicId = match[1];
      const timestamp = Math.round(new Date().getTime() / 1000).toString();
      const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!res.ok) {
        console.error(`Failed to delete image from Cloudinary: ${publicId}`);
      }
    } catch (err) {
      console.error('Error during Cloudinary deletion:', err);
    }
  }
}
