'use client';
import { useState } from "react";

export default function Home() {
	const [formData, setFormData] = useState({
		url: '',
		startTime: '',
		endTime: ''
	});
	const [videoId, setVideoId] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState('');
	const [clip, setClip] = useState(null);

	const extractVideoId = (url) => {
		const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
		const match = url.match(regex);
		return match ? match[1] : null;
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));

		if (name === 'url') {
			const id = extractVideoId(value);
			setVideoId(id);
			setError(id ? '' : 'Please enter a valid YouTube URL');
		}
	};

	const handleGenerateClip = async (e) => {
		e.preventDefault();
		setError('');
		setIsGenerating(true);

		try {
			const response = await fetch('/api/generate-clip', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to generate clip');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			setClip(url);
			// const a = document.createElement('a');
			// a.href = url;
			// a.download = 'clip.mp4';
			// document.body.appendChild(a);
			// a.click();
			// window.URL.revokeObjectURL(url);
			// document.body.removeChild(a);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsGenerating(false);
		}
	};

	const isFormValid = formData.url && formData.startTime && formData.endTime && videoId && !error;

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
						YouTube Clip Generator
					</h1>
					<p className="text-gray-600 dark:text-gray-300">
						Generate and download clips from YouTube videos in seconds
					</p>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
					<form onSubmit={handleGenerateClip} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
								YouTube URL
							</label>
							<input
								type="url"
								name="url"
								value={formData.url}
								onChange={handleInputChange}
								placeholder="https://www.youtube.com/watch?v=..."
								className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
									Start Time (mm:ss)
								</label>
								<input
									type="text"
									name="startTime"
									value={formData.startTime}
									onChange={handleInputChange}
									placeholder="00:00"
									pattern="[0-9]{2}:[0-9]{2}"
									className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
									End Time (mm:ss)
								</label>
								<input
									type="text"
									name="endTime"
									value={formData.endTime}
									onChange={handleInputChange}
									placeholder="00:00"
									pattern="[0-9]{2}:[0-9]{2}"
									className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									required
								/>
							</div>
						</div>

						{error && (
							<div className="text-red-500 text-sm mt-2">
								{error}
							</div>
						)}

						<div className="flex justify-center">
							<button
								type="submit"
								disabled={!isFormValid || isGenerating}
								className={`px-8 py-4 rounded-lg font-medium text-white transition-all duration-200 ${isFormValid && !isGenerating
									? 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
									: 'bg-gray-400 cursor-not-allowed'
									}`}
							>
								{isGenerating ? (
									<span className="flex items-center">
										<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Generating Clip...
									</span>
								) : (
									'Generate Clip'
								)}
							</button>
						</div>
					</form>
				</div>

				{videoId && (
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8">
						<div className="aspect-w-16 aspect-h-9">
							<iframe
								src={`https://www.youtube.com/embed/${videoId}`}
								className="w-full h-full rounded-lg"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
							/>
						</div>
					</div>
				)}

				{clip && (
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
								Generated Clip
							</h2>
							<a href={clip} download="clip.mp4" className="text-blue-600 hover:underline">
								<button className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer">
									Download Clip
								</button>
							</a>
						</div>
						<video src={clip} controls />
					</div>
				)}
			</div>
		</div>
	);
}
