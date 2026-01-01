var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// node:path
var exports_path = {};
__export(exports_path, {
  sep: () => sep,
  resolve: () => resolve,
  relative: () => relative,
  posix: () => posix,
  parse: () => parse,
  normalize: () => normalize,
  join: () => join,
  isAbsolute: () => isAbsolute,
  format: () => format,
  extname: () => extname,
  dirname: () => dirname,
  delimiter: () => delimiter,
  default: () => path_default,
  basename: () => basename,
  _makeLong: () => _makeLong
});
function assertPath(path) {
  if (typeof path !== "string")
    throw TypeError("Path must be a string. Received " + JSON.stringify(path));
}
function normalizeStringPosix(path, allowAboveRoot) {
  var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
  for (var i = 0;i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47)
      break;
    else
      code = 47;
    if (code === 47) {
      if (lastSlash === i - 1 || dots === 1)
        ;
      else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1)
                res = "", lastSegmentLength = 0;
              else
                res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              lastSlash = i, dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += "/..";
          else
            res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += "/" + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i, dots = 0;
    } else if (code === 46 && dots !== -1)
      ++dots;
    else
      dots = -1;
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir)
    return base;
  if (dir === pathObject.root)
    return dir + base;
  return dir + sep + base;
}
function resolve() {
  var resolvedPath = "", resolvedAbsolute = false, cwd;
  for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
    var path;
    if (i >= 0)
      path = arguments[i];
    else {
      if (cwd === undefined)
        cwd = process.cwd();
      path = cwd;
    }
    if (assertPath(path), path.length === 0)
      continue;
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
  }
  if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
    if (resolvedPath.length > 0)
      return "/" + resolvedPath;
    else
      return "/";
  else if (resolvedPath.length > 0)
    return resolvedPath;
  else
    return ".";
}
function normalize(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
  if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
    path = ".";
  if (path.length > 0 && trailingSeparator)
    path += "/";
  if (isAbsolute)
    return "/" + path;
  return path;
}
function isAbsolute(path) {
  return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
}
function join() {
  if (arguments.length === 0)
    return ".";
  var joined;
  for (var i = 0;i < arguments.length; ++i) {
    var arg = arguments[i];
    if (assertPath(arg), arg.length > 0)
      if (joined === undefined)
        joined = arg;
      else
        joined += "/" + arg;
  }
  if (joined === undefined)
    return ".";
  return normalize(joined);
}
function relative(from, to) {
  if (assertPath(from), assertPath(to), from === to)
    return "";
  if (from = resolve(from), to = resolve(to), from === to)
    return "";
  var fromStart = 1;
  for (;fromStart < from.length; ++fromStart)
    if (from.charCodeAt(fromStart) !== 47)
      break;
  var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
  for (;toStart < to.length; ++toStart)
    if (to.charCodeAt(toStart) !== 47)
      break;
  var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
  for (;i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47)
          return to.slice(toStart + i + 1);
        else if (i === 0)
          return to.slice(toStart + i);
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47)
          lastCommonSep = i;
        else if (i === 0)
          lastCommonSep = 0;
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode)
      break;
    else if (fromCode === 47)
      lastCommonSep = i;
  }
  var out = "";
  for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
    if (i === fromEnd || from.charCodeAt(i) === 47)
      if (out.length === 0)
        out += "..";
      else
        out += "/..";
  if (out.length > 0)
    return out + to.slice(toStart + lastCommonSep);
  else {
    if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
      ++toStart;
    return to.slice(toStart);
  }
}
function _makeLong(path) {
  return path;
}
function dirname(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
  for (var i = path.length - 1;i >= 1; --i)
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else
      matchedSlash = false;
  if (end === -1)
    return hasRoot ? "/" : ".";
  if (hasRoot && end === 1)
    return "//";
  return path.slice(0, end);
}
function basename(path, ext) {
  if (ext !== undefined && typeof ext !== "string")
    throw TypeError('"ext" argument must be a string');
  assertPath(path);
  var start = 0, end = -1, matchedSlash = true, i;
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path)
      return "";
    var extIdx = ext.length - 1, firstNonSlashEnd = -1;
    for (i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1)
          matchedSlash = false, firstNonSlashEnd = i + 1;
        if (extIdx >= 0)
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1)
              end = i;
          } else
            extIdx = -1, end = firstNonSlashEnd;
      }
    }
    if (start === end)
      end = firstNonSlashEnd;
    else if (end === -1)
      end = path.length;
    return path.slice(start, end);
  } else {
    for (i = path.length - 1;i >= 0; --i)
      if (path.charCodeAt(i) === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1)
        matchedSlash = false, end = i + 1;
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
}
function extname(path) {
  assertPath(path);
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
  for (var i = path.length - 1;i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    return "";
  return path.slice(startDot, end);
}
function format(pathObject) {
  if (pathObject === null || typeof pathObject !== "object")
    throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  return _format("/", pathObject);
}
function parse(path) {
  assertPath(path);
  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
  if (path.length === 0)
    return ret;
  var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
  if (isAbsolute2)
    ret.root = "/", start = 1;
  else
    start = 0;
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
  for (;i >= start; --i) {
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1)
      if (startPart === 0 && isAbsolute2)
        ret.base = ret.name = path.slice(1, end);
      else
        ret.base = ret.name = path.slice(startPart, end);
  } else {
    if (startPart === 0 && isAbsolute2)
      ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
    else
      ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
    ret.ext = path.slice(startDot, end);
  }
  if (startPart > 0)
    ret.dir = path.slice(0, startPart - 1);
  else if (isAbsolute2)
    ret.dir = "/";
  return ret;
}
var sep = "/", delimiter = ":", posix, path_default;
var init_path = __esm(() => {
  posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse, sep, delimiter, win32: null, posix: null });
  path_default = posix;
});

// core/buildtime/jsonFile.js
var { default: fs} = (() => ({}));

class JSONFile {
  constructor(relPath, properties) {
    this.relPath = relPath;
    if (properties) {
      Object.assign(this, properties);
    }
  }
  write(outputDir = ".") {
    const filePath = path_default.isAbsolute(this.relPath) ? this.relPath : path_default.join(outputDir, this.relPath);
    const dirPath = path_default.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });
    const dataToSerialize = { ...this };
    delete dataToSerialize.relPath;
    const content = JSON.stringify(dataToSerialize, null, 2);
    fs.writeFileSync(filePath, content);
  }
}
var init_jsonFile = __esm(() => {
  init_path();
});

// core/hooks.js
class Hook {
  #listeners = [];
  name;
  description;
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
  register(listener, options) {
    const listenerEntry = { listener, onError: options?.onError || (() => {}) };
    this.#listeners.push(listenerEntry);
    return () => {
      const index = this.#listeners.indexOf(listenerEntry);
      if (index > -1) {
        this.#listeners.splice(index, 1);
      }
    };
  }
  trigger(...args) {
    const results = [];
    for (const entry of this.#listeners) {
      try {
        results.push(entry.listener(...args));
      } catch (error) {
        try {
          entry.onError(error);
        } catch (onErrorError) {}
        results.push(undefined);
      }
    }
    return results;
  }
  clear() {
    this.#listeners = [];
  }
  get count() {
    return this.#listeners.length;
  }
}

// core/treeshake/js.js
function isBuild() {
  return false;
}
function js(path, fn) {
  if (!isBuild()) {
    try {
      if (path === "test2.js")
        fn();
    } catch {}
    return;
  }
  filesToBundle.push({
    target: path,
    type: "js",
    outputName: path.replace(".js", ".bundled.js")
  });
}
function registerBundle(target, environment, options = {}) {
  if (!isBuild())
    return;
  const outputName = target.replace(".js", environment === "content" ? ".bundled.js" : ".js");
  filesToBundle.push({
    target,
    environment,
    outputName,
    options
  });
}
var filesToBundle;
var init_js = __esm(() => {
  filesToBundle = [];
});

// core/treeshake/runtime.js
function isBeingBundled() {
  return true;
}
function isBuild2() {
  return false;
}

// core/buildtime/background.ts
function ensureBackgroundBundle() {
  if (usesBackground)
    return;
  usesBackground = true;
  registerBundle("background.js", "background");
}
var usesBackground = false;
var init_background = __esm(() => {
  init_js();
});

// core/buildtime/index.js
var onBuild;
var init_buildtime = __esm(() => {
  init_js();
  init_background();
  init_manifest();
  init_path();
  try {
    if (false) {}
  } catch (error) {}
  onBuild = new Hook("onBuild", "Called when the browserrc plugin is built");
});

// core/buildtime/manifest.ts
function generateDefaultName() {
  const adjectives = [
    "adventurous",
    "brave",
    "clever",
    "curious",
    "determined",
    "energetic",
    "friendly",
    "generous",
    "helpful"
  ];
  const nouns = [
    "ardvark",
    "bear",
    "cat",
    "dog",
    "elephant",
    "fox",
    "giraffe",
    "hippo"
  ];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}-${noun}`;
}
function getBuildState() {
  if (_buildState)
    return _buildState;
  _buildState = {
    manifests: {
      chrome: Object.assign(new JSONFile("chrome/manifest.json"), { content_scripts: [], permissions: [] }),
      firefox: Object.assign(new JSONFile("firefox/manifest.json"), { content_scripts: [], permissions: [] })
    },
    permissions: new Set,
    actionConfig: null
  };
  return _buildState;
}
async function handlePopupBundling(popup, buildContext) {
  const path = (init_path(), __toCommonJS(exports_path));
  const fs2 = (() => ({}));
  const { outputDir, platforms } = buildContext;
  const buildResult = await Bun.build({
    entrypoints: [popup.index],
    target: "browser",
    minify: false
  });
  if (!buildResult.success) {
    throw new Error(`Popup bundling failed: ${buildResult.logs.map((log) => log.message).join(", ")}`);
  }
  for (const platform of ["chrome", "firefox"]) {
    if (platforms?.[platform]) {
      const popupOutputDir = path.join(outputDir, platform, "popup");
      for (const output of buildResult.outputs) {
        const content = await output.text();
        let outputFilename;
        if (output.path.endsWith(".html")) {
          outputFilename = "popup.html";
        } else {
          outputFilename = path.basename(output.path);
        }
        const outputPath = path.join(popupOutputDir, outputFilename);
        fs2.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs2.writeFileSync(outputPath, content);
      }
    }
  }
}
function addContentScript(options) {
  if (!isBuild2())
    return;
  const state = getBuildState();
  const {
    matches = ["<all_urls>"],
    js: js2,
    run_at = "document_idle",
    all_frames = false,
    platforms = { chrome: true, firefox: true }
  } = options;
  if (!js2 || js2.length === 0) {
    throw new Error("Content script must specify js files");
  }
  const contentScriptEntry = {
    matches,
    js: js2,
    run_at,
    all_frames
  };
  if (platforms?.chrome) {
    state.manifests.chrome.content_scripts.push(contentScriptEntry);
  }
  if (platforms?.firefox) {
    state.manifests.firefox.content_scripts.push(contentScriptEntry);
  }
}
var DEFAULT_VERSION = "0.0.1", DEFAULT_DESCRIPTION = "A browser extension that nobody thought was important enough to write a description for, but is programmed using an awesome framework called browserrc", _buildState = null, _runtimeActionConfig = null, manifest;
var init_manifest = __esm(() => {
  init_jsonFile();
  init_buildtime();
  init_background();
  manifest = {
    name: generateDefaultName(),
    version: DEFAULT_VERSION,
    description: DEFAULT_DESCRIPTION,
    get permissions() {
      if (!isBuild2())
        return [];
      return Array.from(getBuildState().permissions);
    },
    set permissions(perms) {
      if (!isBuild2())
        return;
      const state = getBuildState();
      state.permissions.clear();
      perms.forEach((perm) => state.permissions.add(perm));
    },
    get action() {
      if (!isBuild2())
        return _runtimeActionConfig;
      return getBuildState().actionConfig;
    },
    set action(config) {
      if (!isBuild2()) {
        _runtimeActionConfig = config;
        try {
          if (false) {}
        } catch {}
        return;
      }
      const state = getBuildState();
      if (typeof config === "function") {
        state.actionConfig = {
          default_title: manifest.name,
          onClick: config
        };
        ensureBackgroundBundle();
        return;
      }
      if (config.popup && config.onClick) {
        throw new Error("Action cannot have both popup and onClick. Choose one or the other.");
      }
      if (!config.popup && !config.onClick) {
        throw new Error("Action must have either popup or onClick.");
      }
      if (config.popup && !(config.popup && typeof config.popup === "object" && ("index" in config.popup))) {
        throw new Error('Popup must be a Bun.HTMLBundle from an HTML import (e.g., import popup from "./popup.html").');
      }
      state.actionConfig = config;
      state.actionConfig.default_title = config.default_title || manifest.name;
      if (config.onClick) {
        ensureBackgroundBundle();
      }
      if (config.popup) {
        onBuild.register(async (buildContext) => {
          await handlePopupBundling(config.popup, buildContext);
        });
      }
    },
    assign: (config) => {
      Object.assign(manifest, config);
    }
  };
});

// core/util.js
function bundledName(relpath) {
  return relpath.replace(extname(relpath), ".bundled" + extname(relpath));
}
var init_util = __esm(() => {
  init_path();
});

// core/buildtime/contentScripts.js
function content(relpath, fn, options = {}) {
  if (isBeingBundled()) {
    if (relpath === "test2.js")
      fn();
    return;
  }
  js(relpath, fn);
  addContentScript(Object.assign({
    matches: ["<all_urls>"],
    js: [bundledName(relpath)],
    run_at: "document_idle",
    all_frames: false,
    platforms: { chrome: true, firefox: true }
  }, options));
}
function isContentScript(target, options = {}) {
  if (isBeingBundled()) {
    return target === "test2.js";
  }
  addContentScript(Object.assign({
    matches: ["<all_urls>"],
    js: [bundledName(target)],
    run_at: "document_idle",
    all_frames: false,
    platforms: { chrome: true, firefox: true }
  }, options));
  registerBundle(target, "content", options);
  return false;
}
var __dirname = "/workspace/core/buildtime", contentScripts_default;
var init_contentScripts = __esm(() => {
  init_manifest();
  init_js();
  init_util();
  contentScripts_default = {
    ...{
      create: content,
      isContentScript
    }
  };
});

// core/runtime/index.js
init_manifest();
init_background();
init_contentScripts();
init_js();

// examples/jsSelfBunding.js
var FOO = "BAR";
js("test.js", async () => {
  console.log(FOO);
});
js("test2.js", () => {
  console.log("hello from test2" + FOO);
});
js("test3.js", () => {
  console.log("hello from test3");
});
if (false)
  ;
