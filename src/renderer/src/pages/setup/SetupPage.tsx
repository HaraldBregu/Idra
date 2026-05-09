import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import * as PageModule from '../../components/app/base/Page'

type SetupProvider = {
  id: string
  label: string
  models: string[]
}

type SetupSelection = {
  provider: string
  model: string
  apiKey: string
}

type PageProps = {
  className?: string
  children: ReactNode
}

const Page = (
  PageModule as {
    Page?: ComponentType<PageProps>
    default?: ComponentType<PageProps>
  }
).Page ?? (
  PageModule as {
    Page?: ComponentType<PageProps>
    default?: ComponentType<PageProps>
  }
).default ?? (({ className, children }: PageProps) => <main className={className}>{children}</main>)

const SETUP_STORAGE_KEY = 'friday:assistant-setup'

const PROVIDERS: SetupProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini']
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    models: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest']
  },
  {
    id: 'google',
    label: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro']
  }
]

const DEFAULT_PROVIDER = PROVIDERS[0]!
const getDefaultModel = (provider: SetupProvider) => provider.models[0] ?? ''

const getInitialSelection = (): SetupSelection => {
  if (typeof window === 'undefined') {
    return {
      provider: DEFAULT_PROVIDER.id,
      model: getDefaultModel(DEFAULT_PROVIDER),
      apiKey: ''
    }
  }

  const savedSelection = window.localStorage.getItem(SETUP_STORAGE_KEY)

  if (!savedSelection) {
    return {
      provider: DEFAULT_PROVIDER.id,
      model: getDefaultModel(DEFAULT_PROVIDER),
      apiKey: ''
    }
  }

  try {
    const parsedSelection = JSON.parse(savedSelection) as Partial<SetupSelection>
    const provider = PROVIDERS.find((item) => item.id === parsedSelection.provider) ?? DEFAULT_PROVIDER
    const model = provider.models.includes(parsedSelection.model ?? '')
      ? parsedSelection.model ?? provider.models[0]
      : getDefaultModel(provider)

    return {
      provider: provider.id,
      model: model ?? getDefaultModel(provider),
      apiKey: parsedSelection.apiKey ?? ''
    }
  } catch {
    return {
      provider: DEFAULT_PROVIDER.id,
      model: getDefaultModel(DEFAULT_PROVIDER),
      apiKey: ''
    }
  }
}

const SetupPage = () => {
  const navigate = useNavigate()
  const [selection, setSelection] = useState<SetupSelection>(getInitialSelection)

  const selectedProvider = useMemo(
    () => PROVIDERS.find((provider) => provider.id === selection.provider) ?? DEFAULT_PROVIDER,
    [selection.provider]
  )

  const updateProvider = (providerId: string) => {
    const nextProvider = PROVIDERS.find((provider) => provider.id === providerId) ?? DEFAULT_PROVIDER

    setSelection((currentSelection) => ({
      ...currentSelection,
      provider: nextProvider.id,
      model: getDefaultModel(nextProvider)
    }))
  }

  const saveSelection = () => {
    window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(selection))
    void navigate({ to: '/home', replace: true })
  }

  return (
    <Page className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Assistant setup</p>
          <h1 className="text-3xl font-semibold tracking-normal">Choose your assistant model</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Provider</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                value={selection.provider}
                onChange={(event) => updateProvider(event.target.value)}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Model</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                value={selection.model}
                onChange={(event) =>
                  setSelection((currentSelection) => ({
                    ...currentSelection,
                    model: event.target.value
                  }))
                }
              >
                {selectedProvider.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">API key</span>
              <input
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                type="password"
                value={selection.apiKey}
                placeholder="Enter provider API key"
                autoComplete="off"
                onChange={(event) =>
                  setSelection((currentSelection) => ({
                    ...currentSelection,
                    apiKey: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              type="button"
              onClick={saveSelection}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </Page>
  )
}

export default SetupPage
