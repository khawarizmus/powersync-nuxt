import { createBaseLogger, LogLevel } from '@powersync/web'

export const useDiagnosticsLogger = (callback?: () => void | Promise<void>) => {
  const logger = createBaseLogger()
  logger.useDefaults()
  logger.setLevel(LogLevel.DEBUG)

  logger.setHandler(async (messages, context) => {
    const level = context.level.name
    const messageArray = Array.from(messages)
    const mainMessage = String(messageArray[0] || 'Empty log message')
    const extraData = messageArray.slice(1).reduce((acc, curr) => ({ ...acc, ...curr }), {})

    console.log(`[PowerSync] [${level}] ${context.name ? `[${context.name}]` : ''} ${mainMessage}`, extraData)
    // user defined callback
    await callback?.()
  })

  return logger
}
