const Package = require('./package.json');
const Bluebird = require('bluebird');
const pluginOptions = {
  patchAll: true,
  skipReturnReply: true,
  skipUndefined: true,
  skipReturnError: true,
};

// Returns a patched handler function which will run the original through Bluebird.coroutine
function patchHandler(handler) {
  return function patchedGeneratorHandler(request, reply) {
    Bluebird.coroutine(handler.bind(this))(request, reply)
      .then((handlerResult) => {
        // If the handlerResult is undefined, it's probably because the value was already
        // provided in the handler and we just returned by default.
        if (handlerResult === undefined && pluginOptions.skipUndefined) {
          request.log(['handler'],
            `Undefined return value ignored in generator handler ${handler.name}`);
          return;
        }
        
        // If the success result of the handler is an error either:
        // 1. An error was returned.
        // 2. An error was replied, using the pattern reply(Error)
        // In case 1, we'd probably want to reply the error, but in case 2 it would cause
        // calling reply twice which is an error in Hapi and errors should be thrown anyway.
        // For this reason, if it is an error, we just ignore it.
        if (handlerResult !== undefined && handlerResult.isBoom && pluginOptions.skipReturnError) {
          request.log(['handler'], `Unthrown error ignored in generator handler ${handler.name}`);
          return;
        }

        // If the handler uses the pattern return reply("Foobar") to end execution
        // the handlerResult value will be a response object. A response object has, among others,
        // the properties statusCode, headers, and source. Having all of these present
        // is probably enough to determine that reply was already called and we should do nothing.
        if (handlerResult !== undefined &&
            handlerResult.statusCode !== undefined &&
            handlerResult.headers !== undefined &&
            handlerResult.source !== undefined &&
            pluginOptions.skipReturnReply) {
          return;
        }

        // In every other case, reply with the return value
        reply(handlerResult);
      }).catch((err) => {
        // We get here if an error is thrown during the generator execution. We should just pass
        // the error to reply, which will by default wrap it as a Boom error.
        if (err instanceof Error) reply(err);
        else {
          // You probably shouldn't throw non-errors, but let's handle it the best we can.
          const wrappedError = new Error(`Error thrown in handler ${handler.name}: ${String(err)}`);
          wrappedError.data = err;
          reply(err);
        }
      });
  };
}

// Compare constructor of function to a minimal generator's constructor
function isGenerator(fnToCheck) {
  // eslint-disable-next-line
  return fnToCheck instanceof (function*(){}).constructor;
}

// Iterate through registered routes in the server config and patch routes which
// have a generator as a handler function.
function patchRoutes(server) {
  server.table().forEach((connection) => {
    connection.table.forEach((route) => {
      // Only patch things that look like a generator
      if (!isGenerator(route.settings.handler)) {
        return;
      }

      // We know what we are doing.
      // eslint-disable-next-line no-param-reassign
      route.settings.handler = patchHandler(route.settings.handler);
    });
  });
}

function register(server, _options, next) {
  Object.assign(pluginOptions, _options);
  if (pluginOptions.patchAll !== false) {
    // Hook to patch routes before server starts listening
    server.ext({
      type: 'onPreStart',
      method: (_server, _next) => {
        patchRoutes(_server);
        _next();
      },
    });
  }

  // Register a handler to allow explicitly stating which handlers should be patched
  server.handler('coroutine', (route, options) => patchHandler(options));

  next();
}

register.attributes = { pkg: Package };
module.exports = { register };
