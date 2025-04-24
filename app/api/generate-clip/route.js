import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// Add debug logging to ffmpeg
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');

export async function POST(req) {
	try {
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
			console.log('Processing video with parameters:', { startSeconds, endSeconds, url });

			// Get video info and best format
			const videoId = ytdl.getVideoID(url);
			const info = await ytdl.getInfo(videoId);
			const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p

			console.log('Selected video format:', format.qualityLabel);

			// Create video stream
			const videoStream = ytdl(url, { format });

			// Create temporary files
			const tempDir = os.tmpdir();
			const outputFileName = `${randomUUID()}.mp4`;
			const outputPath = join(tempDir, outputFileName);

			console.log('Using temporary file:', outputPath);

			// Process the video
			await new Promise((resolve, reject) => {
				ffmpeg(videoStream)
					.setStartTime(startSeconds)
					.duration(endSeconds - startSeconds)
					.output(outputPath)
					.on('start', (commandLine) => {
						console.log('FFmpeg command:', commandLine);
					})
					.on('progress', (progress) => {
						console.log('Processing:', progress.percent, '% done');
					})
					.on('end', () => {
						console.log('FFmpeg processing finished');
						resolve();
					})
					.on('error', (err) => {
						console.error('FFmpeg processing error:', err);
						reject(err);
					})
					.run();
			});

			// Read the processed video
			const processedVideo = await readFile(outputPath);
			console.log('Video processed successfully, size:', processedVideo.length, 'bytes');

			// Clean up temp file
			await unlink(outputPath).catch(console.error);

			// Return the processed video
			return new NextResponse(processedVideo, {
				headers: {
					'Content-Type': 'video/mp4',
					'Content-Disposition': `attachment; filename="clip.mp4"`
				}
			});

		} catch (err) {
			console.error('Video processing error:', err);
			return NextResponse.json(
				{ error: 'Failed to process video: ' + err.message },
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