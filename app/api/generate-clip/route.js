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
        console.log('🔗 Received clip request:', { url, startTime, endTime });

        const tempDir = os.tmpdir();
        const timestamp = Date.now();

        const rawVideoPath = join(tempDir, `${timestamp}-raw.mp4`);
        const clippedPath = join(tempDir, `${timestamp}-clipped.mp4`);
        const thumbPath = join(tempDir, `${timestamp}-thumb.jpg`);

        const startSec = timeToSeconds(startTime);
        const duration = timeToSeconds(endTime) - startSec;

        // 1. Download full video
        const downloadCmd = `yt-dlp -f "mp4" -o "${rawVideoPath}" "${url}"`;
        console.log('⬇️ Downloading full video...');
        await execAsync(downloadCmd);
        console.log('✅ Video downloaded:', rawVideoPath);

        // 2. Clip to desired range
        const clipCmd = `ffmpeg -ss ${startSec} -i "${rawVideoPath}" -t ${duration} -c:v libx264 -crf 18 -preset medium -b:v 5M -c:a aac "${clippedPath}"`;
        console.log('✂️ Clipping video...');
        await execAsync(clipCmd);
        console.log('✅ Video clipped:', clippedPath);

        // 3. Generate thumbnail at 1s
        const thumbCmd = `ffmpeg -ss 1 -i "${clippedPath}" -vframes 1 -q:v 2 "${thumbPath}"`;
        console.log('🖼️ Generating thumbnail...');
        await execAsync(thumbCmd);
        console.log('✅ Thumbnail created:', thumbPath);

        // 4. Read final video and thumbnail
        const videoBuffer = await readFile(clippedPath);
        const thumbnailBuffer = await readFile(thumbPath);

        console.log('📦 Sending final reel + thumbnail');

        // 5. Create response
        const response = new NextResponse(videoBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="reel.mp4"',
                'X-Thumbnail-Base64': `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`
            }
        });

        // 6. Cleanup temp files
        await Promise.all([
            unlink(rawVideoPath),
            unlink(clippedPath),
            unlink(thumbPath)
        ]);
        console.log('🧹 Cleaned up temp files');

        return response;
    } catch (err) {
        console.error('❌ Error in POST /clip:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
