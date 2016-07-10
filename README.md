# Kookaburra
Kookaburra is a Hapi plugin that lets you use generator function coroutines as handlers using Bluebird.

See [Bluebird.coroutine](http://bluebirdjs.com/docs/api/promise.coroutine.html) for details.

You can use the usual Hapi reply interface or let Kookaburra handle replying for you by just returning a value or throwing an error.

## Example
```js
const server = require('hapi').Server();
server.connection({ host: 'localhost', port: 3000 });

server.register({
  register: require('kookaburra'),
  options: {},
}, () => {
  server.route([{
    method: 'GET',
    path: '/foobar',
    handler: function* aHandler(request, reply) {
      const value = yield aPromiseCall();
      value.doSomething();
      return reply(value.somethingElse);
      // or simply return value.somethingElse;
    },
  }]);
  
  server.start();
});
```

## Options

- patchAll:
    - Automatically patch all detected generator handlers in route tables. If disabled, you must use the ```handler: { coroutine: *fn() {...} }``` syntax. Default value: ```true```.
- skipReturnReply:
    - Skip replying when a ```return reply();``` return value is detected. If disabled, you shouldn't use that syntax, but it may allow avoiding a falsely detected reply call. Default value: ```true```.
- skipUndefined:
    - Skip replying when a ```undefined``` return value is detected. If disabled, you should always explicitly return something or Kookaburra will send an empty reply. Note that if both ```skipUndefined``` and ```skipReturnReply``` are disabled, you cannot avoid Kookaburra automatically replying other than by returning an error. Default value: ```true```.
- skipReturnError:
    - Skip replying when return value is ```instanceof Error```. This happens if you ```return reply(Error)``` and we shouldn't double reply. Disable if you want to return an error and have Kookaburra reply with it, though throwing the error should be your first option. Default value: ```true```.
