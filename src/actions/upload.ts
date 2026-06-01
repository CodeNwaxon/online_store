'use server';

export async function uploadImageToCloudinary(formData: FormData): Promise<any> {
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!uploadPreset || !cloudName) {
    throw new Error('Cloudinary environment variables are missing');
  }

  // Append the secure upload preset on the server side
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error('Failed to upload image to Cloudinary');
  }

  const data = await res.json();
  return data;
}
