import type { Dispatch } from 'react';
import { useEffect, useRef } from 'react';
import {
	createInitialModelServiceState,
	getAssistantProviders,
	getErrorMessage,
	getSelectedServiceModel,
	isModelStep,
	MODEL_SERVICE_DEFINITIONS,
	SETUP_STEPS,
} from '../constants';
import type { ModelServiceDefinition, ModelServiceId, ProviderModelGroup } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';

export function useModelServices(
	state: SetupState,
	dispatch: Dispatch<SetupAction>,
	navigate: (path: string) => void
) {
	const { step, serviceStates, savingConfig } = state;
	const modelsLoadedRef = useRef(false);

	useEffect(() => {
		if (step === 'providers') {
			modelsLoadedRef.current = false;
		}
	}, [step]);

	useEffect(() => {
		if (!isModelStep(step)) return;
		if (modelsLoadedRef.current) return;
		const service = MODEL_SERVICE_DEFINITIONS.find((item) => item.id === step);
		if (!service) return;
		let cancelled = false;

		async function loadServiceModels(definition: ModelServiceDefinition): Promise<void> {
			dispatch({ type: 'SET_LOADING_MODELS', loading: true });
			dispatch({ type: 'CLEAR_ERROR' });
			try {
				const selection = await definition.getSelection().catch(() => undefined);
				if (cancelled) return;

				const modelGroups: ProviderModelGroup[] = [];
				for (const provider of getAssistantProviders()) {
					const models = await definition.getModels(provider);
					if (models.length > 0) {
						modelGroups.push({ provider, models });
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

				if (cancelled) return;
				const nextServiceStates = createInitialModelServiceState();
				nextServiceStates[definition.id] = { providerId, modelId, modelGroups };
				dispatch({ type: 'LOAD_SERVICE_STATES', states: nextServiceStates });
				modelsLoadedRef.current = true;
			} catch (error) {
				if (cancelled) return;
				console.error('[useModelServices] Failed to load service configuration:', error);
				dispatch({ type: 'LOAD_SERVICE_STATES', states: createInitialModelServiceState() });
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

		void loadServiceModels(service);
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

	async function handleSaveModelStep(
		service: ModelServiceDefinition,
		stepIndex: number
	): Promise<void> {
		if (savingConfig) return;

		dispatch({ type: 'SET_SAVING_CONFIG', saving: true });
		dispatch({ type: 'CLEAR_ERROR' });
		try {
			const selected = getSelectedServiceModel(serviceStates[service.id]);
			if (selected) {
				const saved = await service.saveSelection(selected.provider, selected.model);
				if (!saved) {
					throw new Error(`Could not save the selected ${service.stepTitle} model.`);
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
		handleSaveModelStep,
	};
}
