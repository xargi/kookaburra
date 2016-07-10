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
