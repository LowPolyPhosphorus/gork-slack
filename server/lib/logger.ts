import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import pino, {
  transport as createTransport,
  type TransportTargetOptions,
} from 'pino';
import { env } from '~/env';

const isProd = process.env.NODE_ENV === 'production';
const logDir = env.LOG_DIRECTORY ?? 'logs';
const logLevel = env.LOG_LEVEL ?? 'info';

await mkdir(logDir, { recursive: true });

const runId = new Date()
  .toISOString()
  .replace('T', '_')
  .replace(/[:.]/g, '-')
  .slice(0, 19);

const targets: TransportTargetOptions[] = [];

targets.push({
  target: 'pino/file',
  options: { destination: path.join(logDir, `${runId}.log`) },
  level: logLevel,
});

targets.push({
  target: 'pino-pretty',
  options: {
    colorize: !isProd,
    translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
    ignore: 'pid,hostname',
  },
  level: logLevel,
});

const transport = targets.length > 0 ? createTransport({ targets }) : undefined;

const logger = transport
  ? pino(
      { level: logLevel, timestamp: pino.stdTimeFunctions.isoTime },
      transport
    )
  : pino({ level: logLevel, timestamp: pino.stdTimeFunctions.isoTime });

export default logger;
