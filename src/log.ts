import { format } from "util";
import { TransformConfig, Transform } from "./transform";

// let clients also be able to utilize them 
export { TransformConfig, Transform };

const logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRIT'];

export type LogConfig = {
    correlation_id?: string,
    printCorrelation?: boolean
}
export class Log {
    private _config: LogConfig
    private _transformator: Transform

    public debug = (data: any) => this.logIfLevelInRange('DEBUG', console.log, data);
    public info = (data: any) => this.logIfLevelInRange('INFO', console.info, data);
    public warn = (data: any) => this.logIfLevelInRange('WARN', console.warn, data);
    public error = (data: any, error?: Error) => this.logIfLevelInRange('ERROR', console.error, data, error);
    public crit = (data: any, error?: Error) => this.logIfLevelInRange('CRIT', console.error, data, error);

    constructor(config?: Partial<TransformConfig & LogConfig & { [x: string]: unknown }>) {
        this._config = {
            correlation_id: String(config?.correlation_id),
            printCorrelation: config?.printCorrelation ?? true,
        }
        this._transformator = new Transform({
            inspectOptions: config?.inspectOptions ?? {},
            printMapSetTypes: config?.printMapSetTypes ?? false
        });
    }

    private logIfLevelInRange(loglevel: string, logFn: Function, data: any, error?: Error) {
        if (checkLOGLEVEL(loglevel)) {
            const logData = {
                timestamp: new Date().toISOString(),
                level: loglevel,
                message: this._transformator.transform(data)
            };
            if (this._config.printCorrelation) {
                Object.assign(logData, { correlation: this._config.correlation_id })
            }
            if (error) {
                Object.assign(logData, this._transformator.err(error));
            }
            logFn(format('%j', logData));
        }
    }
}
const allowedLogLevels = (logLevel: string | undefined) => logLevels.slice(logLevels.indexOf(logLevel ?? 'WARN'))
const checkLOGLEVEL = (loglevel: string) => allowedLogLevels(process.env.LOGLEVEL).includes(loglevel)
