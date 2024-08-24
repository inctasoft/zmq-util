[SonarCloud results](https://sonarcloud.io/summary/overall?id=inctasoft_simple-log-ts)
# simple-log-ts

```
npm install @inctasoft/simple-log-ts
```

- `debug`, `info`, `warn`, `error` and `crit` methods.
- JSON format, useful for log ingesting services
- `Error`, `Map` `Set` objects are trnsformed into JSON and also printed
- In case of circular references, output is still JSON, and the message property will contain a string with the value of `util.inspect(data, ...inspectOptions)`. `inspectOptions` by default is `{}` but can be overwritten in Log's constructor
- Optional `correlation_id` can be passed to constructor. Useful for correlating logs from different services. Pass `printCorrelation: false` in Log's constructor to skip it.

## Usage
- Empty config
```typescript
import { Log } from "@inctasoft/simple-log-ts";

const log = new Log();
log.error("something hapened", new Error('some err msg'));
```
results in:
```json
{"timestamp":"2023-10-11T21:50:47.405Z","level":"ERROR","message":"something hapened","correlation":"undefined","[Error]":{"stack":"Error: some err msg\n    at Object..(the err stack)","message":"some err msg"}}```
```
- Log complex objects, provide `correlation_id`
```typescript
import { Log } from "@inctasoft/simple-log-ts";
process.env.LOGLEVEL = 'DEBUG' // default level is WARN, un-silence debug method
const log = new Log({ correlation_id: 'some_guid' });
log.debug({
    a: 1, b: 'xyz', my_set: new Set(['foo', 'bar']), nested: {
        my_arr: [
            'elem1',
            new Map([['mapKey', {
                prop1: 1,
                prop2: new Date()
            }]])]
    }
});
```
results in:
```json
{"timestamp":"2023-10-12T00:14:44.139Z","level":"DEBUG","message":{"a":1,"b":"xyz","my_set":["foo","bar"],"nested":{"my_arr":["elem1",{"mapKey":{"prop1":1,"prop2":"2023-10-12T00:14:44.139Z"}}]}},"correlation":"some_guid"}
```
- If you are interested in which transformed objects were of `Map` or `Set` types, provide `printMapSetTypes: true`
- `Error` objects are always printed as `{"[Error]": {stack:"...", message: "..."}}`
- If you are not into using correlation_id, provide `printCorrelation: false`
```typescript
import { Log } from "@inctasoft/simple-log-ts";

const log = new Log({ printMapSetTypes: true, printCorrelation: false});
log.error({
    a: 1, b: 'xyz', my_set: new Set(['foo', 'bar']), nested: {
        my_arr: [
            'elem1',
            new Map([['mapKey', {
                prop1: 1,
                prop2: new Date()
            }]])]
    }
}, new Error("oops something unexpected happened"));
```
results in:
```json
{"timestamp":"2023-10-12T01:57:31.983Z","level":"ERROR","message":{"a":1,"b":"xyz","my_set":{"[Set]":["foo","bar"]},"nested":{"my_arr":["elem1",{"[Map]":{"mapKey":{"prop1":1,"prop2":"2023-10-12T01:57:31.983Z"}}}]}},"[Error]":{"stack":"Error: oops something unexpected happened\n    at Object..(the err stack)","message":"oops something unexpected happened"}}
```
- Circular reference handlig
```typescript
import { Log } from "../src/log";

const obj: any = {};
obj.a = [obj];
obj.b = {};
obj.b.inner = obj.b;
obj.b.obj = obj;

new Log().warn(obj)
```
results in:
```json
{"timestamp":"2023-10-14T05:59:48.714Z","level":"WARN","message":"<ref *1> {\n  a: [ [Circular *1] ],\n  b: <ref *2> { inner: [Circular *2], obj: [Circular *1] }\n}","correlation":"undefined"}
```
## Log levels
| process.env.LOGLEVEL | active methods | notes |
|---|---|---|
| `DEBUG`| `debug`,`info`,`warn`,`error`,`crit`| | 
| `INFO` | `info`,`warn`,`error`,`crit`|| 
| `WARN` | `warn`,`error`,`crit`| default, if no `LOGLEVEL` is present |
| `ERROR`| `error`,`crit`| Both `crit` and `error` use `console.error` and accept optional second `Error` argument |
| `SILENT` <br/> (or any other value)| `crit` | Lets you silence all logs, if not using `crit` method(as it is always active, no matter of `LOGLEVEL` value) |
