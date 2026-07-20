export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export class Logger {
  private static formatMessage(level: LogLevel, context: string, message: string, details?: any): string {
    const timestamp = new Date().toISOString();
    const detailsStr = details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : '';
    return `[${timestamp}] [${level}] [${context}]: ${message}${detailsStr}`;
  }

  public static info(context: string, message: string, details?: any) {
    console.log(this.formatMessage(LogLevel.INFO, context, message, details));
  }

  public static warn(context: string, message: string, details?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, context, message, details));
  }

  public static error(context: string, message: string, details?: any) {
    console.error(this.formatMessage(LogLevel.ERROR, context, message, details));
  }

  public static debug(context: string, message: string, details?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage(LogLevel.DEBUG, context, message, details));
    }
  }
}
