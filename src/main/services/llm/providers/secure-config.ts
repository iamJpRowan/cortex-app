import { safeStorage } from 'electron'

/**
 * Decrypt apiKeyEncrypted in provider config and expose as apiKey (in memory only).
 * Use when passing config to adapters that need the plain API key for requests.
 * Never persist or log the decrypted value.
 */
export function getProviderConfigWithDecryptedKeys(
  raw: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const config = { ...raw }
  const encrypted = config.apiKeyEncrypted
  if (
    typeof encrypted === 'string' &&
    encrypted.length > 0 &&
    safeStorage.isEncryptionAvailable()
  ) {
    try {
      ;(config as Record<string, unknown>).apiKey = safeStorage.decryptString(
        Buffer.from(encrypted, 'base64')
      )
    } catch {
      // Leave apiKey unset; adapter will fail with auth error
    }
  }
  return config
}
