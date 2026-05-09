import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { AppIconFriday } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { H4, Muted, Small } from '@/components/ui/Typography';

const WelcomePage: React.FC = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();

	return (
		<div className="flex h-full flex-col items-center justify-center bg-background px-8 py-12">
			<div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
				<div className="flex flex-col items-center gap-3">
					<AppIconFriday
						className="text-foreground"
						style={{
							width: 'clamp(56px, min(10vw, 10vh), 80px)',
							height: 'clamp(56px, min(10vw, 10vh), 80px)',
						}}
						aria-label={t('appTitle')}
						role="img"
					/>
					<div className="flex flex-col gap-1">
						<H4 className="text-foreground">{t('appTitle')}</H4>
						<Muted className="leading-relaxed">{t('welcome.tagline')}</Muted>
					</div>
					<Small className="font-normal text-muted-foreground">
						{t('welcome.freePlan')} &bull;{' '}
						<span className="text-primary">{t('welcome.upgradeToPro')}</span>
					</Small>
				</div>

				<Button
					className="w-full justify-center gap-2"
					onClick={() => navigate({ to: '/settings/assistant' })}
				>
					{t('welcome.continue', 'Continue')}
					<ArrowRight className="size-4" />
				</Button>
			</div>
		</div>
	);
};

export default WelcomePage;
