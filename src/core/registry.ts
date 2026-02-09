import { TranslationProvider } from "@/interfaces"

type ProviderConstructor = new (apiKey: string, model: string) => TranslationProvider

const providers = new Map<string, ProviderConstructor>()

export const registerProvider = (name: string, providerClass: ProviderConstructor) => {
  providers.set(name, providerClass)
}

export const getProvider = (name: string, apiKey: string, model: string): TranslationProvider => {
  const ProviderClass = providers.get(name)
  if (!ProviderClass) {
    throw new Error(
      `Provider ${name} not found. Available providers: ${Array.from(providers.keys()).join(", ")}`
    )
  }
  return new ProviderClass(apiKey, model)
}
