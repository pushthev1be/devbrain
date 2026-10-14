'use strict';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			var isInstance = false;
      try {
        isInstance = this instanceof a;
      } catch (e) {}
			if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var theInteractiveTerminalUI;
var hasRequiredTheInteractiveTerminalUI;

function requireTheInteractiveTerminalUI () {
	if (hasRequiredTheInteractiveTerminalUI) return theInteractiveTerminalUI;
	hasRequiredTheInteractiveTerminalUI = 1;
	theInteractiveTerminalUI = {};
	throw new Error("DevBrain was built without the interactive terminal UI, so the plugin stays inside the file limits Anthropic's plugin directory enforces. Matching on wording and on exact error text still works. Install the devbrain CLI for the full build.");
}

var theADKAgentRoute;
var hasRequiredTheADKAgentRoute;

function requireTheADKAgentRoute () {
	if (hasRequiredTheADKAgentRoute) return theADKAgentRoute;
	hasRequiredTheADKAgentRoute = 1;
	theADKAgentRoute = {};
	throw new Error("DevBrain was built without the ADK agent route, so the plugin stays inside the file limits Anthropic's plugin directory enforces. Matching on wording and on exact error text still works. Install the devbrain CLI for the full build.");
}

exports.getAugmentedNamespace = getAugmentedNamespace;
exports.getDefaultExportFromCjs = getDefaultExportFromCjs;
exports.requireTheADKAgentRoute = requireTheADKAgentRoute;
exports.requireTheInteractiveTerminalUI = requireTheInteractiveTerminalUI;
