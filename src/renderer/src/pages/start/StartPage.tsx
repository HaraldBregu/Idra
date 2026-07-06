import React, { useReducer } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModelServiceStep } from './components/ModelServiceStep';
import { PresentationStep } from './components/PresentationStep';
import { ProviderStep } from './components/ProviderStep';
import { StepProgress } from './components/StepProgress';
import {
	getSelectedServiceModel,
	isModelStep,
	MODEL_SERVICE_DEFINITIONS,
	SETUP_STEPS,
} from './constants';
import { useModelServices } from './hooks/useModelServices';
import { useProviderSetup } from './hooks/useProviderSetup';
import { initialSetupState, setupReducer } from './state/reducer';

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

	const {
		updateProviderEntry,
		handleProviderApiKeyChange,
		saveProviderEntry,
		handleContinueProviders,
		handleOpenProviderLink,
	} = useProviderSetup(state, dispatch);

	const { handleServiceProviderChange, handleServiceModelChange, handleSaveModelStep } =
		useModelServices(state, dispatch, navigate);

	const stepIndex = SETUP_STEPS.indexOf(step);
	const currentService = isModelStep(step)
		? MODEL_SERVICE_DEFINITIONS.find((service) => service.id === step)
		: undefined;
	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && savingProviderId === null;
	const selectedServiceModel = currentService
		? getSelectedServiceModel(serviceStates[currentService.id])
		: undefined;
	const canContinueModelStep =
		currentService !== undefined &&
		(!currentService.required || selectedServiceModel !== undefined) &&
		!loadingModels &&
		!savingConfig;
	const isBusy = savingProviderId !== null || savingConfig;

	function handleBack(): void {
		const previousStep = SETUP_STEPS[Math.max(0, stepIndex - 1)];
		dispatch({ type: 'GO_TO_STEP', step: previousStep });
	}

	function handlePrimaryAction(): void {
		if (step === 'presentation') {
			dispatch({ type: 'GO_TO_STEP', step: 'providers' });
			return;
		}

		if (step === 'providers') {
			void handleContinueProviders();
			return;
		}

		if (currentService) {
			void handleSaveModelStep(currentService, stepIndex);
		}
	}

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (isBusy) return 'Saving...';
		if (stepIndex === SETUP_STEPS.length - 1) return 'Finish';
		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (currentService) return !canContinueModelStep;
		return isBusy;
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'presentation') return <PresentationStep />;

		if (step === 'providers') {
			return (
				<ProviderStep
					providerEntries={providerEntries}
					savingProviderId={savingProviderId}
					onUpdateEntry={updateProviderEntry}
					onApiKeyChange={handleProviderApiKeyChange}
					onSave={saveProviderEntry}
					onOpenLink={handleOpenProviderLink}
				/>
			);
		}

		if (currentService) {
			return (
				<ModelServiceStep
					service={currentService}
					serviceState={serviceStates[currentService.id]}
					loadingModels={loadingModels}
					savingConfig={savingConfig}
					onProviderChange={handleServiceProviderChange}
					onModelChange={handleServiceModelChange}
				/>
			);
		}

		return <PresentationStep />;
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
				{errorMessage ? (
					<div className="mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" />
						<p className="min-w-0 break-words text-xs font-medium leading-4">{errorMessage}</p>
					</div>
				) : null}
			</section>

			<footer className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2 sm:px-5">
				<StepProgress currentIndex={stepIndex} />
				<div className="flex items-center gap-2">
					{step !== 'presentation' ? (
						<Button type="button" variant="outline" size="xs" disabled={isBusy} onClick={handleBack}>
							Back
						</Button>
					) : null}
					<Button
						type="button"
						size="sm"
						disabled={isPrimaryDisabled()}
						onClick={handlePrimaryAction}
					>
						{isBusy ? (
							<LoaderCircle className="size-3.5 animate-spin" />
						) : (
							<ArrowRight className="size-3.5" />
						)}
						{getPrimaryLabel()}
					</Button>
				</div>
			</footer>
		</main>
	);
};

export default StartPage;
