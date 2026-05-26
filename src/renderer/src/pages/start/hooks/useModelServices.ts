import type { Dispatch } from 'react';
import { useEffect } from 'react';
import {
	createInitialModelServiceState,
	getErrorMessage,
	getSelectedServiceModel,
	MODEL_SERVICE_DEFINITIONS,
	SETUP_STEPS,
	supportedProviderIds,
} from '../constants';
import type { ModelServiceDefinition, ModelServiceId, ProviderModelGroup } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';

export function useModelServices(
	state: SetupState,
	dispatch: Dispatch<SetupAction>,
	connectedProviderIds: ReadonlySet<string>,
	navigate: (path: string) => void
) {
	const { step, serviceStates, savingConfig } = state;

	useEffect(() => {
		if (step === 'presentation' || step === 'providers') return;
		let cancelled = false;

		async function loadServiceModels(): Promise<void> {
			dispatch({ type: 'SET_LOADING_MODELS', loading: true });
			dispatch({ type: 'CLEAR_ERROR' });
			try {
				const [storedProviders, ...configuredOperators] = await Promise.all([
					window.store.getProviders(),
					...MODEL_SERVICE_DEFINITIONS.map((service) => service.getOperator()),
				]);
				if (cancelled) return;

				const selectableProviders = storedProviders.filter((provider) =>
					supportedProviderIds.has(provider.id)
				);
				const nextServiceStates = createInitialModelServiceState();
				let firstError: unknown;

				if (selectableProviders.length > 0) {
					for (let i = 0; i < MODEL_SERVICE_DEFINITIONS.length; i += 1) {
						const service = MODEL_SERVICE_DEFINITIONS[i];
						const operator = configuredOperators[i];

						const preferredProvider =
							(operator
								? selectableProviders.find((p) => p.id === operator.provider.id)
								: undefined) ??
							selectableProviders.find((p) => connectedProviderIds.has(p.id)) ??
							selectableProviders[0];

						const modelGroups: ProviderModelGroup[] = [];
						for (const provider of selectableProviders) {
							try {
								const models = await service.getModels(provider);
								if (models.length > 0) {
									modelGroups.push({ provider, models });
								}
							} catch (error) {
								console.warn('[useModelServices] Failed to load models for provider:', provider.id, error);
								firstError ??= error;
							}
						}

						const preferredGroup =
							modelGroups.find((g) => g.provider.id === preferredProvider?.id) ?? modelGroups[0];
						const providerId = preferredGroup?.provider.id ?? '';
						const preferredModelId = operator?.model.id;
						const modelId =
							preferredGroup?.models.find((m) => m.id === preferredModelId)?.id ??
							preferredGroup?.models[0]?.id ??
							'';

						nextServiceStates[service.id] = { providerId, modelId, modelGroups };
					}
				}

				if (cancelled) return;
				dispatch({ type: 'LOAD_SERVICE_STATES', states: nextServiceStates });

				if (firstError) {
					dispatch({
						type: 'SET_ERROR',
						message: getErrorMessage(firstError, 'Could not load models.'),
					});
				}
			} catch (error) {
				if (cancelled) return;
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

		void loadServiceModels();
		return () => {
			cancelled = true;
		};
	}, [connectedProviderIds, step, dispatch]);

	function handleServiceProviderChange(serviceId: ModelServiceId, value: string | null): void {
		const providerId = value ?? '';
		const group = serviceStates[serviceId].modelGroups.find(
			(item) => item.provider.id === providerId
		);
		dispatch({ type: 'CLEAR_ERROR' });
		dispatch({
			type: 'CHANGE_SERVICE_PROVIDER',
			serviceId,
			providerId,
			modelId: group?.models[0]?.id ?? '',
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

		const selected = getSelectedServiceModel(serviceStates[service.id]);
		dispatch({ type: 'SET_SAVING_CONFIG', saving: true });
		dispatch({ type: 'CLEAR_ERROR' });
		try {
			if (selected) {
				const saved = await service.saveOperator(selected.provider, selected.model);
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
