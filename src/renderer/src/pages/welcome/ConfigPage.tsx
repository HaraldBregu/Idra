import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppIconFriday } from '@/components/app';
import { H1, H4, Muted, Small } from '@/components/ui/Typography';
import { PageBody, PageContainer } from '@/components/app/base/page';

interface ConfigPageProps {
	onConfigured: () => void;
}

const ConfigPage: React.FC<ConfigPageProps> = () => {
	const { t } = useTranslation();
	// const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// const form = useForm({
	// 	defaultValues: DEFAULT_VALUES,
	// 	onSubmit: async ({ value }) => {
	// 		if (typeof window.app?.completeFirstRunConfiguration !== 'function') return;
	// 		setErrorMessage(null);
	// 		try {
	// 			const providers: ProviderEntry[] = PROVIDER_IDS.flatMap((providerId) => {
	// 				const catalog = getProvider(providerId);
	// 				if (!catalog) return [];
	// 				return [
	// 					{
	// 						id: catalog.id,
	// 						name: catalog.name,
	// 						apiKey: value.tokens[providerId].trim(),
	// 						model: '',
	// 					},
	// 				];
	// 			});
	// 			const startupInfo = await window.app.completeFirstRunConfiguration(
	// 				{ firstName: value.firstName, lastName: value.lastName },
	// 				providers
	// 			);
	// 			onConfigured(startupInfo);
	// 		} catch (error) {
	// 			setErrorMessage(
	// 				error instanceof Error
	// 					? error.message
	// 					: t(
	// 							'startup.firstTime.error',
	// 							'Unable to save your provider tokens right now. Please try again.'
	// 						)
	// 			);
	// 		}
	// 	},
	// });

	return (
		<PageContainer className="h-full">

			<PageBody className="p-0">
				<div className="grid min-h-full lg:grid-cols-2">
					<div className="flex flex-col gap-4 p-6 md:p-10 overflow-y-auto lg:order-2">
						<div className="flex flex-1 items-center justify-center">
							<div className="w-full max-w-sm">
								{/* <form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="flex flex-col gap-6"
									noValidate
								>
									<FieldGroup>
										<div className="flex flex-col gap-2 text-left">
											<H3>{t('startup.firstTime.title', 'Get started')}</H3>
											<Muted>
														{t(
															'startup.firstTime.description',
															'Add your name and at least one API key.'
														)}
													</Muted>
										</div>

										<FieldSet>
											<FieldGroup>
												<form.Field
													name="firstName"
													validators={{
														onChange: ({ value }) =>
															value.trim().length === 0
																? t(
																		'startup.firstTime.firstNameRequired',
																		'First name is required'
																	)
																: undefined,
													}}
												>
													{(field) => {
														const showError =
															field.state.meta.isTouched &&
															field.state.meta.errors.length > 0;
														return (
															<Field data-invalid={showError || undefined}>
																<FieldLabel htmlFor={field.name}>
																	{t('settings.profile.firstName', 'First name')}
																</FieldLabel>
																<Input
																	id={field.name}
																	name={field.name}
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => {
																		field.handleChange(e.target.value);
																		if (errorMessage) setErrorMessage(null);
																	}}
																	placeholder="Ada"
																	autoComplete="given-name"
																	aria-invalid={showError}
																/>
																{showError && (
																	<FieldError>{String(field.state.meta.errors[0])}</FieldError>
																)}
															</Field>
														);
													}}
												</form.Field>
												<form.Field
													name="lastName"
													validators={{
														onChange: ({ value }) =>
															value.trim().length === 0
																? t(
																		'startup.firstTime.lastNameRequired',
																		'Last name is required'
																	)
																: undefined,
													}}
												>
													{(field) => {
														const showError =
															field.state.meta.isTouched &&
															field.state.meta.errors.length > 0;
														return (
															<Field data-invalid={showError || undefined}>
																<FieldLabel htmlFor={field.name}>
																	{t('settings.profile.lastName', 'Last name')}
																</FieldLabel>
																<Input
																	id={field.name}
																	name={field.name}
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => {
																		field.handleChange(e.target.value);
																		if (errorMessage) setErrorMessage(null);
																	}}
																	placeholder="Lovelace"
																	autoComplete="family-name"
																	aria-invalid={showError}
																/>
																{showError && (
																	<FieldError>{String(field.state.meta.errors[0])}</FieldError>
																)}
															</Field>
														);
													}}
												</form.Field>
											</FieldGroup>
										</FieldSet>

										<FieldSet>
											<FieldGroup>
												{PROVIDER_IDS.map((providerId) => (
													<form.Field
														key={providerId}
														name={`tokens.${providerId}` as const}
													>
														{(field) => (
															<Field>
																<FieldLabel htmlFor={`first-run-${providerId}`}>
																	{PROVIDER_LABELS[providerId]}
																	<span className="ml-1 text-xs font-normal text-muted-foreground">
																		{t('startup.firstTime.optional', '(optional)')}
																	</span>
																</FieldLabel>
																<Input
																	id={`first-run-${providerId}`}
																	type="password"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => {
																		field.handleChange(e.target.value);
																		if (errorMessage) setErrorMessage(null);
																	}}
																	placeholder={t(
																		'startup.firstTime.tokenPlaceholder',
																		'sk-•••••••••••••••••••••'
																	)}
																	autoComplete="off"
																	spellCheck={false}
																	className="font-mono"
																/>
															</Field>
														)}
													</form.Field>
												))}
												<FieldDescription>
													{t(
														'startup.firstTime.tokensHint',
														'Add at least one to start writing. Keys are encrypted with your OS keychain — never synced, never logged.'
													)}
												</FieldDescription>
											</FieldGroup>
										</FieldSet>

										{errorMessage && (
											<p className="text-xs text-destructive">{errorMessage}</p>
										)}

										<Field>
											<form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
												{([canSubmit, isSubmitting]) => (
													<Button
														type="submit"
														disabled={!canSubmit || isSubmitting}
														className="w-full"
													>
														{isSubmitting ? (
															<>
																<Loader2 className="animate-spin" />
																{t('startup.firstTime.saving', 'Setting things up…')}
															</>
														) : (
															<>
																{t('startup.firstTime.save', 'Enter Friday')}
																<ArrowRight />
															</>
														)}
													</Button>
												)}
											</form.Subscribe>
											<FieldDescription className="text-center">
												{t(
													'startup.firstTime.privacy',
													'By continuing you agree to the Terms and Privacy Policy.'
												)}
											</FieldDescription>
										</Field>
									</FieldGroup>
								</form> */}
							</div>
						</div>
					</div>
					<div className="relative hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:order-1 p-10 gap-10 border-r border-sidebar-border">
						<div className="flex items-center gap-3">
							<AppIconFriday
								className="size-12 text-sidebar-primary"
								aria-hidden="true"
							/>
							<div className="flex flex-col">
								<H4 className="text-sidebar-foreground leading-tight">{t('appTitle')}</H4>
								<Small className="text-sidebar-foreground/60 font-normal tracking-wide">{t('startup.firstTime.slogan', 'Write freely. Own everything.')}</Small>
							</div>
						</div>

						<div className="flex flex-1 flex-col justify-center gap-6 max-w-md">
							<H1 className="text-left text-4xl font-semibold leading-tight text-sidebar-foreground">
								{t(
									'startup.firstTime.leftTitle',
									'Your writing, your models, your machine.'
								)}
							</H1>
							<Muted className="text-sidebar-foreground/70 leading-relaxed">
								{t(
									'startup.firstTime.leftDescription',
									'Friday is a local-first writing studio. Bring your own keys for OpenAI, Anthropic, Google, and more — drafts and credentials never leave your device.'
								)}
							</Muted>
							<ul className="flex flex-col gap-3 text-sm text-sidebar-foreground/80">
								<li className="flex gap-2">
									<span aria-hidden="true" className="text-sidebar-primary">→</span>
									{t(
										'startup.firstTime.leftBullet1',
										'Encrypted local storage. No accounts, no cloud sync.'
									)}
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true" className="text-sidebar-primary">→</span>
									{t(
										'startup.firstTime.leftBullet2',
										'Switch providers per document. Compare answers side-by-side.'
									)}
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true" className="text-sidebar-primary">→</span>
									{t(
										'startup.firstTime.leftBullet3',
										'Works offline once your keys are configured.'
									)}
								</li>
							</ul>
						</div>

						<footer className="flex flex-col gap-2 text-xs text-sidebar-foreground/60 max-w-md">
							<Small className="font-normal">{t(
									'startup.firstTime.leftFooterTagline',
									'Built by writers, for writers. Free and open source.'
								)}
							</Small>
							<div className="flex gap-4">
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterPrivacy', 'Privacy')}
								</a>
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterTerms', 'Terms')}
								</a>
								<a href="#" className="hover:underline">
									{t('startup.firstTime.leftFooterDocs', 'Documentation')}
								</a>
								<span className="ml-auto">v{__APP_VERSION__}</span>
							</div>
						</footer>
					</div>
				</div>
			</PageBody>
		</PageContainer>
	);
};

export default ConfigPage;
