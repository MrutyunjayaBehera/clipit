import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Initialize FFmpeg
let ffmpeg = null;

export async function POST(req) {
	try {
		// Parse request body
		const body = await req.json();
		const { url, startTime, endTime } = body;

		if (!url || !startTime || !endTime) {
			return NextResponse.json(
				{ error: 'Missing required parameters' },
				{ status: 400 }
			);
		}

		// Convert time format (mm:ss) to seconds
		const startSeconds = convertTimeToSeconds(startTime);
		const endSeconds = convertTimeToSeconds(endTime);

		try {
			// Initialize FFmpeg if not already initialized
			if (!ffmpeg) {
				ffmpeg = new FFmpeg();
				await ffmpeg.load();
			}

			// Get video info and choose format
			const videoId = ytdl.getVideoID(url);
			const info = await ytdl.getInfo(videoId);
			const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p

			// Download video
			const videoStream = ytdl(url, { format });
			const chunks = [];

			for await (const chunk of videoStream) {
				chunks.push(chunk);
			}

			const videoBuffer = Buffer.concat(chunks);

			// Process video
			await ffmpeg.writeFile('input.mp4', await fetchFile(videoBuffer));

			await ffmpeg.exec([
				'-i', 'input.mp4',
				'-ss', startSeconds.toString(),
				'-t', (endSeconds - startSeconds).toString(),
				'-c:v', 'copy',
				'-c:a', 'copy',
				'output.mp4'
			]);

			const data = await ffmpeg.readFile('output.mp4');

			// Clean up
			await ffmpeg.deleteFile('input.mp4');
			await ffmpeg.deleteFile('output.mp4');

			// Return the processed video
			return new NextResponse(data, {
				headers: {
					'Content-Type': 'video/mp4',
					'Content-Disposition': 'attachment; filename="clip.mp4"'
				}
			});

		} catch (err) {
			console.error('Video processing error:', err);
			return NextResponse.json(
				{ error: 'Failed to process video' },
				{ status: 500 }
			);
		}
	} catch (err) {
		console.error('Request error:', err);
		if (err instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

function convertTimeToSeconds(timeString) {
	const [minutes, seconds] = timeString.split(':').map(Number);
	return minutes * 60 + seconds;
}