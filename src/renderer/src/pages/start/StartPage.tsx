import React, { useMemo, useReducer } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
	getSelectedServiceModel,
	isModelStep,
	MODEL_SERVICE_DEFINITIONS,
	MODEL_SERVICE_STEP_IDS,
	SETUP_STEPS,
} from './constants';
import { useModelServices } from './hooks/useModelServices';
import { useProviderSetup } from './hooks/useProviderSetup';
import { initialSetupState, setupReducer } from './state/reducer';
import { ModelServiceStep } from './components/ModelServiceStep';
import { PresentationStep } from './components/PresentationStep';
import { ProviderStep } from './components/ProviderStep';
import { StepProgress } from './components/StepProgress';

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [state, dispatch] = useReducer(setupReducer, initialSetupState);
	const {
		step,
		providerEntries,
		savingProviderId,
		serviceStates,
		loadingModels,
		savingConfig,
		errorMessage,
	} = state;

	const stepIndex = SETUP_STEPS.indexOf(step);
	const currentModelService = MODEL_SERVICE_DEFINITIONS.find((s) => s.id === step);
	const isLastModelStep =
		currentModelService?.id === MODEL_SERVICE_STEP_IDS[MODEL_SERVICE_STEP_IDS.length - 1];

	const connectedProviderIds = useMemo(
		() =>
			new Set(
				providerEntries.filter((entry) => entry.apiKeySaved).map((entry) => entry.providerId)
			),
		[providerEntries]
	);

	const providerSetup = useProviderSetup(state, dispatch);
	const modelServices = useModelServices(state, dispatch, connectedProviderIds, navigate);

	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && !savingProviderId;
	const isBusy = savingProviderId !== null || savingConfig;
	const currentServiceSelected =
		currentModelService !== undefined
			? getSelectedServiceModel(serviceStates[currentModelService.id]) !== undefined
			: false;
	const canSaveModelSetup =
		!loadingModels &&
		!savingConfig &&
		(!isModelStep(step) || !currentModelService?.required || currentServiceSelected);

	function handleBack(): void {
		dispatch({ type: 'GO_TO_STEP', step: SETUP_STEPS[Math.max(0, stepIndex - 1)] });
	}

	function handlePrimaryAction(): void {
		if (step === 'presentation') {
			dispatch({ type: 'GO_TO_STEP', step: 'providers' });
			return;
		}
		if (step === 'providers') {
			void providerSetup.handleContinueProviders();
			return;
		}
		if (isModelStep(step) && currentModelService) {
			void modelServices.handleSaveModelStep(currentModelService, stepIndex);
		}
	}

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';
		if (isModelStep(step) && isLastModelStep) return 'Get started';
		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (isModelStep(step)) return !canSaveModelSetup;
		return isBusy;
	}

	function renderPrimaryButton(): React.JSX.Element {
		const button = (
			<Button
				type="button"
				size="sm"
				disabled={isPrimaryDisabled()}
				onClick={handlePrimaryAction}
			>
				{savingProviderId !== null || savingConfig ? (
					<LoaderCircle className="size-3.5 animate-spin" />
				) : (
					<ArrowRight className="size-3.5" />
				)}
				{getPrimaryLabel()}
			</Button>
		);

		const shouldShowProvidersTooltip = step === 'providers' && !canContinueProviders;
		const shouldShowModelTooltip =
			isModelStep(step) &&
			currentModelService?.required === true &&
			!currentServiceSelected;

		if (shouldShowProvidersTooltip || shouldShowModelTooltip) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger render={<span className="inline-flex">{button}</span>} />
						<TooltipContent>
							{shouldShowProvidersTooltip
								? 'Save an API key to continue.'
								: 'Select a model to continue.'}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return button;
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'presentation') {
			return <PresentationStep />;
		}
		if (step === 'providers') {
			return (
				<ProviderStep
					providerEntries={providerEntries}
					savingProviderId={savingProviderId}
					onUpdateEntry={providerSetup.updateProviderEntry}
					onApiKeyChange={providerSetup.handleProviderApiKeyChange}
					onSave={providerSetup.saveProviderEntry}
					onOpenLink={providerSetup.handleOpenProviderLink}
				/>
			);
		}
		if (isModelStep(step) && currentModelService) {
			return (
				<ModelServiceStep
					service={currentModelService}
					serviceState={serviceStates[currentModelService.id]}
					loadingModels={loadingModels}
					savingConfig={savingConfig}
					onProviderChange={modelServices.handleServiceProviderChange}
					onModelChange={modelServices.handleServiceModelChange}
				/>
			);
		}
		return <></>;
	}

	return (
		<main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
			<header className="pointer-events-none fixed inset-x-0 top-12 z-40 px-4 py-3 sm:px-6">
				<nav
					aria-label="Setup navigation"
					className="mx-auto flex w-full max-w-2xl items-center justify-end"
				>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="pointer-events-auto"
						onClick={() => navigate('/home')}
					>
						Skip
					</Button>
				</nav>
			</header>

			<section className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 sm:px-6">
				{renderStepContent()}
			</section>

			<footer className="flex shrink-0 flex-col border-t border-border bg-card/60">
				{errorMessage ? (
					<div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" />
						<p className="min-w-0 break-words text-xs font-medium leading-4">{errorMessage}</p>
					</div>
				) : null}
				<div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
					<StepProgress currentIndex={stepIndex} />
					<div className="flex items-center gap-2">
						{step !== 'presentation' ? (
							<Button
								type="button"
								variant="outline"
								size="xs"
								disabled={isBusy}
								onClick={handleBack}
							>
								Back
							</Button>
						) : null}
						{renderPrimaryButton()}
					</div>
				</div>
			</footer>
		</main>
	);
};

export default StartPage;
