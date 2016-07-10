const Hapi = require('hapi');
const Plugin = require('./index.js');

const server = new Hapi.Server({
  debug: {
    request: ['error', 'handler'],
  },
});
server.connection({
  host: 'localhost',
  port: 3000,
});

function waitALittle(value, timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(value);
    }, timeout || 1000);
  });
}

server.register({
  register: Plugin,
  options: {
    patchAll: true,
  },
}, () => {
  server.route([{
    method: 'GET',
    path: '/new/{foobar?}',
    * handler(request, reply) {
      console.log('Request new');
      const value = yield waitALittle(request.params.foobar);
      return reply(value);
    },
  }, {
    method: 'GET',
    path: '/old/{foobar?}',
    handler: function basicHandler(request, reply) {
      console.log('Request old');
      const value = waitALittle(request.params.foobar, 5000);
      return reply(value);
    },
  }, {
    method: 'GET',
    path: '/different/{foobar?}',
    config: {
      handler: {
        coroutine: function* handler(request, reply) {
          console.log('Request different');
          const value = yield waitALittle(request.params.foobar);
          return value;
        }
      },
    },
  }]);

  server.start();
});
