import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Clean filename and add timestamp to prevent conflicts
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const filename = `${timestamp}_${originalName}`;
    
    // Save to public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filepath = path.join(uploadsDir, filename);
    
    await writeFile(filepath, buffer);

    // Return the public URL
    const imageUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
