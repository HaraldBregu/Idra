import type { Dispatch } from 'react';
import { useEffect, useRef } from 'react';
import { AGENTS } from '@/lib/compat';
import type { SttSelectionMode } from '../../../../../shared/stt_transcription';
import {
	createInitialModelServiceState,
	createInitialSpeechModeState,
	getErrorMessage,
	getProvidersForService,
	getSelectedServiceModel,
	loadSpeechModeStates,
	MODEL_SERVICE_DEFINITIONS,
	SETUP_STEPS,
	SPEECH_MODE_IDS,
} from '../constants';
import type { ModelServiceDefinition, ModelServiceId, ProviderModelGroup } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';

export function useModelServices(
	state: SetupState,
	dispatch: Dispatch<SetupAction>,
	navigate: (path: string) => void
) {
	const { step, serviceStates, speechModeStates, savingConfig } = state;
	const modelsLoadedRef = useRef(false);

	useEffect(() => {
		if (step === 'providers') {
			modelsLoadedRef.current = false;
		}
	}, [step]);

	useEffect(() => {
		if (step === 'presentation' || step === 'providers') return;
		if (modelsLoadedRef.current) return;
		let cancelled = false;

		async function loadServiceModels(): Promise<void> {
			dispatch({ type: 'SET_LOADING_MODELS', loading: true });
			dispatch({ type: 'CLEAR_ERROR' });
			try {
				const configuredSelections = await Promise.all(
					MODEL_SERVICE_DEFINITIONS.map((service) => service.getSelection())
				);
				if (cancelled) return;

				const nextServiceStates = createInitialModelServiceState();
				let firstError: unknown;

				for (let i = 0; i < MODEL_SERVICE_DEFINITIONS.length; i += 1) {
					const service = MODEL_SERVICE_DEFINITIONS[i];
					if (service.id === AGENTS.speechToText) continue;

					const selection = configuredSelections[i];

					let providers: Awaited<ReturnType<typeof getProvidersForService>> = [];
					try {
						providers = await getProvidersForService(service.id);
					} catch (error) {
						console.warn(
							'[useModelServices] Failed to load providers for service:',
							service.id,
							error
						);
						firstError ??= error;
					}

					const modelGroups: ProviderModelGroup[] = [];
					for (const provider of providers) {
						try {
							const models = await service.getModels(provider);
							if (models.length > 0) {
								modelGroups.push({ provider, models });
							}
						} catch (error) {
							console.warn(
								'[useModelServices] Failed to load models for provider:',
								provider.id,
								error
							);
							firstError ??= error;
						}
					}

					let providerId = '';
					let modelId = '';
					if (selection) {
						const selectedGroup = modelGroups.find(
							(group) => group.provider.id === selection.provider.id
						);
						const selectedModel = selectedGroup?.models.find(
							(model) => model.id === selection.model.id
						);
						if (selectedGroup && selectedModel) {
							providerId = selectedGroup.provider.id;
							modelId = selectedModel.id;
						}
					}

					nextServiceStates[service.id] = { providerId, modelId, modelGroups };
				}

				let nextSpeechModeStates = createInitialSpeechModeState();
				try {
					nextSpeechModeStates = await loadSpeechModeStates({ restoreSelection: false });
				} catch (error) {
					console.warn('[useModelServices] Failed to load speech mode states:', error);
					firstError ??= error;
				}

				if (cancelled) return;
				dispatch({ type: 'LOAD_SERVICE_STATES', states: nextServiceStates });
				dispatch({ type: 'LOAD_SPEECH_MODE_STATES', states: nextSpeechModeStates });
				modelsLoadedRef.current = true;

				if (firstError) {
					dispatch({
						type: 'SET_ERROR',
						message: getErrorMessage(firstError, 'Could not load models.'),
					});
				}
			} catch (error) {
				if (cancelled) return;
				console.error('[useModelServices] Failed to load service configuration:', error);
				dispatch({ type: 'LOAD_SERVICE_STATES', states: createInitialModelServiceState() });
				dispatch({ type: 'LOAD_SPEECH_MODE_STATES', states: createInitialSpeechModeState() });
				dispatch({
					type: 'SET_ERROR',
					message: getErrorMessage(error, 'Could not load models for this provider.'),
				});
			} finally {
				if (!cancelled) {
					dispatch({ type: 'SET_LOADING_MODELS', loading: false });
				}
			}
		}

		void loadServiceModels();
		return () => {
			cancelled = true;
		};
	}, [step, dispatch]);

	function handleServiceProviderChange(serviceId: ModelServiceId, value: string | null): void {
		const providerId = value ?? '';
		const group = serviceStates[serviceId].modelGroups.find(
			(item) => item.provider.id === providerId
		);
		dispatch({ type: 'CLEAR_ERROR' });
		dispatch({
			type: 'CHANGE_SERVICE_PROVIDER',
			serviceId,
			providerId: group?.provider.id ?? providerId,
			modelId: '',
		});
	}

	function handleServiceModelChange(serviceId: ModelServiceId, value: string | null): void {
		dispatch({ type: 'CLEAR_ERROR' });
		dispatch({ type: 'CHANGE_SERVICE_MODEL', serviceId, modelId: value ?? '' });
	}

	function handleSpeechModeProviderChange(mode: SttSelectionMode, value: string | null): void {
		const providerId = value ?? '';
		const group = speechModeStates[mode].modelGroups.find(
			(item) => item.provider.id === providerId
		);
		dispatch({ type: 'CLEAR_ERROR' });
		dispatch({
			type: 'CHANGE_SPEECH_MODE_PROVIDER',
			mode,
			providerId: group?.provider.id ?? providerId,
			modelId: '',
		});
	}

	function handleSpeechModeModelChange(mode: SttSelectionMode, value: string | null): void {
		dispatch({ type: 'CLEAR_ERROR' });
		dispatch({ type: 'CHANGE_SPEECH_MODE_MODEL', mode, modelId: value ?? '' });
	}

	async function saveSpeechModeSelections(): Promise<void> {
		for (const mode of SPEECH_MODE_IDS) {
			const selected = getSelectedServiceModel(speechModeStates[mode]);
			if (!selected) continue;
			const saved = await window.transcribe.saveSelection(
				selected.provider.id,
				selected.model.id,
				mode
			);
			if (!saved) {
				throw new Error(`Could not save the selected ${mode} transcribe model.`);
			}
		}
	}

	async function handleSaveModelStep(
		service: ModelServiceDefinition,
		stepIndex: number
	): Promise<void> {
		if (savingConfig) return;

		dispatch({ type: 'SET_SAVING_CONFIG', saving: true });
		dispatch({ type: 'CLEAR_ERROR' });
		try {
			if (service.id === AGENTS.speechToText) {
				await saveSpeechModeSelections();
			} else {
				const selected = getSelectedServiceModel(serviceStates[service.id]);
				if (selected) {
					const saved = await service.saveSelection(selected.provider, selected.model);
					if (!saved) {
						throw new Error(`Could not save the selected ${service.stepTitle} model.`);
					}
				}
			}

			const nextStep = SETUP_STEPS[stepIndex + 1];
			if (!nextStep) {
				navigate('/home');
				return;
			}
			dispatch({ type: 'GO_TO_STEP', step: nextStep });
		} catch (error) {
			console.error('[useModelServices] Failed to save model service config:', error);
			dispatch({
				type: 'SET_ERROR',
				message: getErrorMessage(error, `Could not save the selected ${service.stepTitle} model.`),
			});
		} finally {
			dispatch({ type: 'SET_SAVING_CONFIG', saving: false });
		}
	}

	return {
		handleServiceProviderChange,
		handleServiceModelChange,
		handleSpeechModeProviderChange,
		handleSpeechModeModelChange,
		handleSaveModelStep,
	};
}
