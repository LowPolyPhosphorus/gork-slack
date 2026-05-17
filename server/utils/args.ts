import { z } from 'zod';
import { splitArgs } from './text';

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Maps positional tokens to named keys in definition order, then validates
 * against a Zod object schema.
 *
 * Usage:
 *   const result = parseCommandArgs('set channel ping', {
 *     subcommand: z.enum(['set', 'show', 'clear']),
 *     scope: z.enum(['workspace', 'channel']).optional(),
 *     mode: z.enum(['ping', 'relevance']).optional(),
 *   });
 *   // result.data → { subcommand: 'set', scope: 'channel', mode: 'ping' }
 */
export function parseCommandArgs<T extends z.ZodRawShape>(
  text: string,
  shape: T
): ParseResult<z.infer<z.ZodObject<T>>> {
  const tokens = splitArgs(text).map((t) => t.toLowerCase());
  const keys = Object.keys(shape);
  const raw = Object.fromEntries(keys.map((k, i) => [k, tokens[i]]));

  const result = z.object(shape).safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const messages = result.error.issues.map((issue) => {
    const field = String(issue.path[0] ?? '');
    if (issue.code === 'invalid_value') {
      const opts = issue.values.map((v) => `\`${String(v)}\``).join(', ');
      const got = raw[field];
      return field
        ? `unknown ${field} \`${got}\`, valid: ${opts}`
        : `unknown value, valid: ${opts}`;
    }
    return field ? `${field}: ${issue.message}` : issue.message;
  });

  return { success: false, error: messages.join(', ') };
}
