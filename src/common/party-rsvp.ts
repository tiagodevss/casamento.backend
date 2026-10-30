type ConfigReader = { get?: <T = string>(key: string, defaultValue?: T) => T | undefined };

/**
 * A resposta sobre a festa pode ser encerrada por PARTY_RSVP_OPEN=false.
 * O ConfigService devolve boolean (valor já validado) ou string (process.env), então
 * qualquer outro valor que não seja "false" mantém a festa aberta.
 */
export function isPartyRsvpOpen(config: ConfigReader | undefined): boolean {
  const value = config?.get?.<string | boolean>('PARTY_RSVP_OPEN', true);
  return String(value ?? true).toLowerCase() !== 'false';
}
