import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

function Slider({
	className,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>): React.JSX.Element {
	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				'relative flex touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col w-full',
				className
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className="absolute bg-foreground/30 data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
				/>
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				className="block size-3 shrink-0 rounded-full border border-border bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
			/>
		</SliderPrimitive.Root>
	);
}

export { Slider };
