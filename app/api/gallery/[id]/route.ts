import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'gallery.json');

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ error: 'Gallery data not found' }, { status: 404 });
    }
    
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    let gallery = JSON.parse(data);
    
    gallery = gallery.filter((item: any) => item.id !== id);
    
    fs.writeFileSync(dataFilePath, JSON.stringify(gallery, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
  }
}
