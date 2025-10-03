import { createBaseLogger, LogLevel } from '@powersync/web'
import { createConsola, type LogType } from 'consola'
import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/session-storage'

const logsStorage = createStorage({
  driver: localStorageDriver({ base: 'powersync:' }),
})

const consola = createConsola({
  level: 5, // trace
  fancy: true,
  formatOptions: {
    columns: 80,
    colors: true,
    compact: false,
    date: true,
  },
})

consola.addReporter({
  log: async (logObject) => {
    await logsStorage.set(`log:${logObject.date.toISOString()}`, logObject)
  },
})

export const useDiagnosticsLogger = (callback?: () => void | Promise<void>) => {
  const logger = createBaseLogger()
  logger.useDefaults()
  logger.setLevel(LogLevel.DEBUG)

  logger.setHandler(async (messages, context) => {
    const level = context.level.name
    const messageArray = Array.from(messages)
    const mainMessage = String(messageArray[0] || 'Empty log message')
    const extraData = messageArray.slice(1).reduce((acc, curr) => ({ ...acc, ...curr }), {})

    consola[level.toLowerCase() as LogType](`[PowerSync] ${context.name ? `[${context.name}]` : ''} ${mainMessage}`, extraData, context)
    // user defined callback
    await callback?.()
  })

  return { logger, logsStorage }
}
