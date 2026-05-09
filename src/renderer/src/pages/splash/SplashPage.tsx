import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AppIconFriday } from '@/components/app/icons/AppIconFriday';

const SplashPage: React.FC = () => {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void navigate({ to: '/setup', replace: true });
		}, 1800);

		return () => {
			window.clearTimeout(timer);
		};
	}, [navigate]);

	return (
		<div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-background via-background to-background/95">
			<div className="animate-fade-in animate-bounce-slow">
				<AppIconFriday className="w-48 h-48" />
			</div>

			<style>{`
				@keyframes fade-in {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				@keyframes bounce-slow {
					0%, 100% {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-12px);
					}
				}

				.animate-fade-in {
					animation: fade-in 0.6s ease-in-out;
				}

				.animate-bounce-slow {
					animation: bounce-slow 2s infinite;
				}
			`}</style>
		</div>
	);
};

export default SplashPage;
