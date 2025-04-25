import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

function timeToSeconds(time) {
    const [min, sec] = time.split(':').map(Number);
    return min * 60 + sec;
}

export async function POST(req) {
    try {
        const { url, startTime, endTime } = await req.json();
        const outputPath = join(os.tmpdir(), `${randomUUID()}.mp4`);
        
        const startSec = timeToSeconds(startTime);
        const duration = timeToSeconds(endTime) - startSec;
        
        const cmd = `yt-dlp -f "bv*+ba/b" "${url}" -o - | ffmpeg -i pipe:0 -ss ${startSec} -t ${duration} -c copy "${outputPath}"`;
        await execAsync(cmd);
        
        const response = new NextResponse(await readFile(outputPath), {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="clip.mp4"'
            }
        });
        await unlink(outputPath);
        
        return response;
    } catch (err) {
        console.error('Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}