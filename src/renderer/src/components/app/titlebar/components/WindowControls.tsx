import { Minus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TitleBarRightContainer } from '../TitleBarRightContainer';

const btnBase =
	'flex items-center justify-center h-full w-[46px] text-muted-foreground hover:bg-accent/80 hover:text-foreground active:bg-accent transition-colors duration-100';

export function WindowControls() {
	const { t } = useTranslation();

	return (
		<TitleBarRightContainer>
			<button
				type="button"
				onClick={() => window.win?.minimize()}
				className={btnBase}
				title={t('titleBar.minimize')}
			>
				<Minus className="h-[13px] w-[13px]" strokeWidth={1.5} />
			</button>

			<button
				type="button"
				onClick={() => window.win?.close()}
				className="flex items-center justify-center h-full w-[46px] text-muted-foreground hover:bg-[#e81123] hover:text-white active:bg-[#c42b1c] active:text-white transition-colors duration-100"
				title={t('titleBar.close')}
			>
				<X className="h-[13px] w-[13px]" strokeWidth={1.5} />
			</button>
		</TitleBarRightContainer>
	);
}
