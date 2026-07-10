import { NextRequest, NextResponse } from 'next/server';
import { createTimer, deleteTimer, listTimers, updateTimer } from '../data';

export async function GET() {
  try {
    const timers = await listTimers();
    return NextResponse.json(timers);
  } catch (error) {
    console.error('Error fetching timers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, startTime, endTime, isActive, status = 'active', mode = 'down' } = await request.json();
    
    const timer = await createTimer({ title, startTime, endTime, isActive, status, mode });
    
    return NextResponse.json(timer);
  } catch (error) {
    console.error('Error creating timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, startTime, endTime, isActive, status = isActive ? 'active' : 'paused', mode = 'down' } = await request.json();

    const timer = await updateTimer({ id, title, startTime, endTime, isActive, status, mode });
    
    return NextResponse.json(timer);
  } catch (error) {
    console.error('Error updating timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    await deleteTimer(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
