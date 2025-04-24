import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export async function POST(req) {
	try {
		const { url, startTime, endTime } = await req.json();

		if (!url || !startTime || !endTime) {
			return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
		}

		// Convert time format (mm:ss) to seconds
		const startSeconds = convertTimeToSeconds(startTime);
		const endSeconds = convertTimeToSeconds(endTime);

		// Download video
		const videoId = ytdl.getVideoID(url);
		const videoInfo = await ytdl.getInfo(videoId);
		const format = ytdl.chooseFormat(videoInfo.formats, { quality: '18' });

		// Load FFmpeg if not already loaded
		if (!ffmpeg.isLoaded()) {
			await ffmpeg.load();
		}

		// Download the video segment
		const videoData = await ytdl(url, { format });
		const inputFileName = 'input.mp4';
		const outputFileName = 'output.mp4';

		ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoData));

		// Cut the video
		await ffmpeg.run(
			'-i', inputFileName,
			'-ss', startSeconds.toString(),
			'-t', (endSeconds - startSeconds).toString(),
			'-c:v', 'copy',
			'-c:a', 'copy',
			outputFileName
		);

		// Read the output file
		const data = ffmpeg.FS('readFile', outputFileName);

		// Cleanup
		ffmpeg.FS('unlink', inputFileName);
		ffmpeg.FS('unlink', outputFileName);

		return new NextResponse(data, {
			headers: {
				'Content-Type': 'video/mp4',
				'Content-Disposition': `attachment; filename="clip.mp4"`,
			},
		});
	} catch (error) {
		console.error('Error generating clip:', error);
		return NextResponse.json({ error: 'Failed to generate clip' }, { status: 500 });
	}
}

function convertTimeToSeconds(timeString) {
	const [minutes, seconds] = timeString.split(':').map(Number);
	return minutes * 60 + seconds;
}