import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavHistory } from '../hooks/useNavHistory';
import { NavButton } from './NavButton';

export function NavigationButtons() {
	const { t } = useTranslation();
	const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();

	return (
		<div className="ml-2 flex items-center">
			<NavButton ghost onClick={goBack} disabled={!canGoBack} title={t('titleBar.navigateBack')}>
				<ArrowLeft className="h-[15px] w-[15px]" strokeWidth={1.5} />
			</NavButton>
			<NavButton ghost onClick={goForward} disabled={!canGoForward} title={t('titleBar.navigateForward')}>
				<ArrowRight className="h-[15px] w-[15px]" strokeWidth={1.5} />
			</NavButton>
		</div>
	);
}
