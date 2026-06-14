import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'gallery.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading gallery data:', error);
    return NextResponse.json({ error: 'Failed to read gallery data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newItem = await request.json();
    let gallery = [];
    
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      gallery = JSON.parse(data);
    }
    
    gallery.unshift(newItem);
    fs.writeFileSync(dataFilePath, JSON.stringify(gallery, null, 2));
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
  }
}
