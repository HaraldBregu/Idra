export async function svgToPng(svg: string): Promise<Blob> {
	const documentSvg = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
	const viewBox = documentSvg.getAttribute('viewBox')?.split(/\s+/).map(Number);
	const width = Math.max(1, viewBox?.[2] || Number.parseFloat(documentSvg.getAttribute('width') ?? '') || 1200);
	const height = Math.max(1, viewBox?.[3] || Number.parseFloat(documentSvg.getAttribute('height') ?? '') || 800);
	const scale = Math.min(3, 4096 / Math.max(width, height));
	const image = new Image();
	const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
	try {
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error('Unable to rasterize this SVG.'));
			image.src = url;
		});
		const canvas = document.createElement('canvas');
		canvas.width = Math.ceil(width * scale);
		canvas.height = Math.ceil(height * scale);
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Canvas rendering is unavailable.');
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to create the PNG.')), 'image/png');
		});
	} finally {
		URL.revokeObjectURL(url);
	}
}
