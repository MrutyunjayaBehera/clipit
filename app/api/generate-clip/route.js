import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

const execAsync = promisify(exec);

function timeToSeconds(time) {
    const [min, sec] = time.split(':').map(Number);
    return min * 60 + sec;
}

export async function POST(req) {
    try {
        const { url, startTime, endTime } = await req.json();
        const tempDir = os.tmpdir();

        const timestamp = Date.now();
        const rawVideoPath = join(tempDir, `${timestamp}-raw.mp4`);
        const outputPath = join(tempDir, `${timestamp}-clip.mp4`);

        const startSec = timeToSeconds(startTime);
        const duration = timeToSeconds(endTime) - startSec;

        // Step 1: Download the video
        const downloadCmd = `yt-dlp -f "mp4" -o "${rawVideoPath}" "${url}"`;
        await execAsync(downloadCmd);

        // Step 2: Clip using ffmpeg
        const clipCmd = `ffmpeg -ss ${startSec} -i "${rawVideoPath}" -t ${duration} -c:v libx264 -c:a aac "${outputPath}"`;
        await execAsync(clipCmd);

        // Step 3: Send the response
        const data = await readFile(outputPath);
        const response = new NextResponse(data, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="clip.mp4"'
            }
        });

        // Step 4: Clean up
        await unlink(rawVideoPath);
        await unlink(outputPath);

        return response;
    } catch (err) {
        console.error('🔥 Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
