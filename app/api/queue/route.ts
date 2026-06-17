import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'queue.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading queue data:', error);
    return NextResponse.json({ error: 'Failed to read queue data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newItem = await request.json();
    let queue = [];

    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      queue = JSON.parse(data);
    }

    queue.unshift(newItem);
    fs.writeFileSync(dataFilePath, JSON.stringify(queue, null, 2));

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error saving queue item:', error);
    return NextResponse.json({ error: 'Failed to save queue item' }, { status: 500 });
  }
}
