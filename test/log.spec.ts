import { describe, jest, expect, test, beforeEach } from '@jest/globals';
import { Log } from '../src/log';
import { inspect } from 'util';

jest.mock('console');
const console_error = console.error = jest.fn()
console.info = jest.fn()
console.log = jest.fn()
const console_warn = console.warn = jest.fn()
const dateISOStringMatcher = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const logMetadataMatcher = (level: string, correlation?: string) => ({
    timestamp: expect.stringMatching(dateISOStringMatcher),
    level,
    correlation: String(correlation)
});

const env = process.env;

const testString = "this is test log message";
const testErrorMessage = "errorObject.message";
const testCorrelationId = "this is correlation id";
const testMap = new Map<any, any>([
    ['a', 1], ['b', new Date()],
    ['nestedMap', new Map<any, any>([
        ['c', 3], ['nestedSet', new Set([1, new Map<any, any>([
            ['deep_nested_map_key1', 1], ['deep_nested_map_key2', new Set(['deep_nested_set_elem1', 'deep_nested_set_elem2'])]])])]])]
]);
const testObject = { prop1: testMap, prop2: [1, { nested: 2 }] };
const testSet = new Set<any>([testMap, testObject, 'test_set_elem']);
const testError = new Error(testErrorMessage);

beforeEach(() => {
    process.env = { ...env }
})
describe('process.env.LOGLEVEL', () => {

    test.each`
    LOGLEVEL    |expectedLogMethods 
    ${'DEBUG'}  |${['debug', 'info', 'warn', 'error', 'crit']}
    ${'INFO'}   |${['info', 'warn', 'error', 'crit']}
    ${'WARN'}   |${['warn', 'error', 'crit']}
    ${'ERROR'}  |${['error', 'crit']}
    ${'CRIT'}   |${['crit']}
    ${'ANY_OTHER'}  |${['crit']} // crit is always enabled, even if LOGLEVEL is not part of supported values
        `("$LOGLEVEL activates $expectedLogMethods",
        (args) => {
            const LOGLEVEL = args.LOGLEVEL as string;
            const expectedLogMethods = args.expectedLogMethods as string[];

            //ARRANGE
            process.env.LOGLEVEL = LOGLEVEL;
            const log = new Log()

            // ACT
            log.debug(testString);
            log.info(testString);
            log.warn(testString);
            log.error(testString);
            log.crit(testString);

            // ASSERT log.debug
            if ((expectedLogMethods).includes('debug')) {
                expect(console.log).toBeCalledTimes(1);
            } else {
                expect(console.log).toBeCalledTimes(0)
            }

            // ASSERT log.info
            if ((expectedLogMethods).includes('info')) {
                expect(console.info).toBeCalledTimes(1);
            } else {
                expect(console.info).toBeCalledTimes(0)
            }

            // ASSERT log.warn
            if ((expectedLogMethods).includes('warn')) {
                expect(console.warn).toBeCalledTimes(1)
            } else {
                expect(console.warn).toBeCalledTimes(0)
            }

            // ASSERT how many times console.error was called, having in mind both CRIT and ERROR use it
            let expectedConsoleErrCalls = 0;
            if (expectedLogMethods.includes('error')) {
                expectedConsoleErrCalls += 1;
            }
            if (expectedLogMethods.includes('crit')) {
                expectedConsoleErrCalls += 1;
            }
            expect(console.error).toBeCalledTimes(expectedConsoleErrCalls)
        });

    test("if LOGLEVEL is undefined, default level is WARN", () => {
        process.env.LOGLEVEL = undefined
        const log = new Log();

        log.debug(testString)
        log.info(testString)
        log.warn(testString)
        log.error(testString)
        log.crit(testString)

        expect(console.info).toBeCalledTimes(0)
        expect(console.log).toBeCalledTimes(0)
        expect(console.warn).toBeCalledTimes(1)
        expect(console.error).toBeCalledTimes(2) //1 for error, 1 for crit
    });
});
describe('correlation', () => {
    it('(default) prints correlation if not provided `printCorrelation: false`', () => {
        const expectedJsonLogged = {
            ...logMetadataMatcher("WARN", testCorrelationId),
            message: testString
        };

        const log = new Log({ correlation_id: testCorrelationId });
        log.warn(testString);

        const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
        expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
    });
    it('(default) prints correlation:\'undefined\' if not provided correlation_id', () => {
        const expectedJsonLogged = {
            ...logMetadataMatcher("WARN"),
            message: testString
        };

        const log = new Log();
        log.warn(testString);

        const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
        expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
    });
    it('Does not print correlation if provided printCorrelation: false', () => {
        const expectedJsonLogged = {
            timestamp: expect.stringMatching(dateISOStringMatcher),
            level: "WARN",
            message: testString
        };

        const log = new Log({ printCorrelation: false });
        log.warn(testString);

        const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
        expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
    });
});
it('handles circular references', () => {
    const a: any = { a: 1 }
    Object.assign(a, { b: a });
    const log = new Log();
    expect(() => log.warn(a)).not.toThrow();

    const expectedJsonLogged = {
        ...logMetadataMatcher("WARN"),
        message: inspect(a)
    };

    const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
    expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
});

describe('Log stetements depending on config', () => {
    describe('(default) when config.printMapSetTypes = false', () => {
        const expectTransformed_testMap = {
            "a": 1,
            "b": expect.stringMatching(dateISOStringMatcher),
            "nestedMap": {
                "c": 3,
                "nestedSet": [1, {
                    "deep_nested_map_key1": 1,
                    "deep_nested_map_key2": [
                        'deep_nested_set_elem1',
                        'deep_nested_set_elem2'
                    ]
                }]
            }
        };
        const expectTranformed_testObject = {
            prop1: expectTransformed_testMap,
            prop2: [1, { nested: 2 }]
        };
        const expectTranformed_testSet = [expectTransformed_testMap, expectTranformed_testObject, 'test_set_elem'];

        test('Does not wrap Map types with [Map]', () => {
            const expected = {
                ...logMetadataMatcher("WARN"),
                message: expectTransformed_testMap
            };
            const log = new Log()
            log.warn(testMap);
            const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expected);
        });

        test('Object and Array type is never printed as it is obvious', () => {

            const expectedJsonLogged = {
                ...logMetadataMatcher("WARN"),
                message: expectTranformed_testObject
            };

            const log = new Log()
            log.warn(testObject);

            const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
        });

        test('Error type is always wrapped with [Error]', () => {

            const expectedJsonLogged = {
                ...logMetadataMatcher("ERROR"),
                message: testString,
                "[Error]": {
                    message: testErrorMessage,
                    stack: expect.stringContaining('Error:')
                }

            };

            const log = new Log()
            log.error(testString, testError);

            const actualCallArgumentsValidJson = JSON.parse(String(console_error.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
        });


        test('Does not wrap Set types with [Set]', () => {
            const expectedJsonLogged = {
                ...logMetadataMatcher("WARN"),
                message: expectTranformed_testSet
            };
            const log = new Log()
            log.warn(testSet);
            const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
        });
    });

    describe('when config.printMapSetTypes = true', () => {
        const expectTransformed_testMap = {
            "[Map]": {
                "a": 1,
                "b": expect.stringMatching(dateISOStringMatcher),
                "nestedMap": {
                    "[Map]": {
                        "c": 3,
                        "nestedSet": {
                            "[Set]": [
                                1, {
                                    "[Map]": {
                                        "deep_nested_map_key1": 1,
                                        "deep_nested_map_key2": {
                                            "[Set]": [
                                                "deep_nested_set_elem1",
                                                "deep_nested_set_elem2",
                                            ],
                                        },
                                    },
                                }
                            ]
                        }
                    }
                }
            }
        };
        const expectTranformed_testObject = {
            prop1: expectTransformed_testMap,
            prop2: [1, { nested: 2 }]
        };
        const expectTranformed_testSet = {
            "[Set]": [expectTransformed_testMap, expectTranformed_testObject, 'test_set_elem']
        };

        test('Wraps Map types with [Map]', () => {
            const expected = {
                ...logMetadataMatcher("WARN"),
                message: expectTransformed_testMap
            };
            const log = new Log({ printMapSetTypes: true });
            log.warn(testMap);
            const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expected);
        });

        test('Wraps Set types with [Set]', () => {
            const expectedJsonLogged = {
                ...logMetadataMatcher("WARN"),
                message: expectTranformed_testSet
            };
            const log = new Log({ printMapSetTypes: true });
            log.warn(testSet);
            const actualCallArgumentsValidJson = JSON.parse(String(console_warn.mock.calls[0][0]));
            expect(actualCallArgumentsValidJson).toEqual(expectedJsonLogged);
        });
    });
});