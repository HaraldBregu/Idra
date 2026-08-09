const svgNamespace = 'http://www.w3.org/2000/svg';

export function flattenForeignObjects(svg: SVGSVGElement): void {
	for (const foreignObject of svg.querySelectorAll('foreignObject')) {
		const clone = foreignObject.cloneNode(true) as Element;
		for (const lineBreak of clone.querySelectorAll('br')) lineBreak.replaceWith('\n');
		const lines = (clone.textContent ?? '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
		const x = Number.parseFloat(foreignObject.getAttribute('x') ?? '0');
		const y = Number.parseFloat(foreignObject.getAttribute('y') ?? '0');
		const width = Number.parseFloat(foreignObject.getAttribute('width') ?? '0');
		const height = Number.parseFloat(foreignObject.getAttribute('height') ?? '0');
		const text = document.createElementNS(svgNamespace, 'text');
		text.setAttribute('x', String(x + width / 2));
		text.setAttribute('y', String(y + height / 2));
		text.setAttribute('text-anchor', 'middle');
		text.setAttribute('dominant-baseline', 'middle');
		const label = foreignObject.querySelector<HTMLElement>('.nodeLabel, .edgeLabel, .label, span, div');
		if (label?.className) text.setAttribute('class', label.className);
		for (const [index, line] of (lines.length ? lines : ['']).entries()) {
			const span = document.createElementNS(svgNamespace, 'tspan');
			span.setAttribute('x', String(x + width / 2));
			span.setAttribute('dy', index === 0 ? `${(1 - lines.length) * 0.6}em` : '1.2em');
			span.textContent = line;
			text.append(span);
		}
		foreignObject.replaceWith(text);
	}
}
