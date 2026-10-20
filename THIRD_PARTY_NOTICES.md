# 第三方声明

本文件记录本项目使用的第三方软件及服务的许可证与来源，不是对整个分发包的权利清除证明。自有代码的授权范围见 [COPYRIGHT.md](COPYRIGHT.md)。

## npm 依赖

### 直接依赖

| 依赖 | 解析版本 | 许可证 | 上游 |
| --- | --- | --- | --- |
| axios | 1.20.0 | MIT | https://github.com/axios/axios |
| cors | 2.8.6 | MIT | https://github.com/expressjs/cors |
| express | 4.22.3 | MIT | https://github.com/expressjs/express |
| https-proxy-agent | 9.1.0 | MIT | https://github.com/TooTallNate/proxy-agents |
| sqlite3 | 6.0.1 | BSD-3-Clause | https://github.com/TryGhost/node-sqlite3 |
| undici | 7.30.0 | MIT | https://github.com/nodejs/undici |
| uuid | 9.0.1 | MIT | https://github.com/uuidjs/uuid |
| ws | 8.22.0 | MIT | https://github.com/websockets/ws |

### 许可证汇总

| 许可证 | 包数量 |
| --- | --- |
| MIT | 118 |
| ISC | 13 |
| BlueOak-1.0.0 | 5 |
| Apache-2.0 | 3 |
| BSD-3-Clause | 3 |
| (MIT OR WTFPL) | 1 |
| (BSD-2-Clause OR MIT OR Apache-2.0) | 1 |

### 兼容性说明

- 以上全部为宽松许可证（MIT、ISC、BSD-3-Clause、Apache-2.0、BlueOak-1.0.0）。MIT、ISC、BSD 与 Apache-2.0 均可与 AGPL-3.0-or-later 组合使用；BlueOak-1.0.0 同样是宽松许可证，未发现与之冲突的条款；
- `expand-template` 的许可证为 `(MIT OR WTFPL)`，`rc` 为 `(BSD-2-Clause OR MIT OR Apache-2.0)`，均为可选择其一的双重或多重许可，本项目按 MIT 使用；
- 本说明不构成法律意见。

### 完整清单

<details>
<summary>展开全部 144 个包</summary>

| 包 | 许可证 | 上游 |
| --- | --- | --- |
| @isaacs/fs-minipass@4.0.1 | ISC | https://github.com/npm/fs-minipass |
| abbrev@4.0.0 | ISC | https://github.com/npm/abbrev-js |
| accepts@1.3.8 | MIT | https://github.com/jshttp/accepts |
| agent-base@6.0.2 | MIT | https://github.com/TooTallNate/node-agent-base |
| agent-base@9.0.0 | MIT | https://github.com/TooTallNate/proxy-agents |
| array-flatten@1.1.1 | MIT | https://github.com/blakeembrey/array-flatten |
| asynckit@0.4.0 | MIT | https://github.com/alexindigo/asynckit |
| axios@1.20.0 | MIT | https://github.com/axios/axios |
| base64-js@1.5.1 | MIT | https://github.com/beatgammit/base64-js |
| bindings@1.5.0 | MIT | https://github.com/TooTallNate/node-bindings |
| bl@4.1.0 | MIT | https://github.com/rvagg/bl |
| body-parser@1.20.8 | MIT | https://github.com/expressjs/body-parser |
| buffer@5.7.1 | MIT | https://github.com/feross/buffer |
| bytes@3.1.2 | MIT | https://github.com/visionmedia/bytes.js |
| call-bind-apply-helpers@1.0.2 | MIT | https://github.com/ljharb/call-bind-apply-helpers |
| call-bound@1.0.4 | MIT | https://github.com/ljharb/call-bound |
| chownr@1.1.4 | ISC | https://github.com/isaacs/chownr |
| chownr@3.0.0 | BlueOak-1.0.0 | https://github.com/isaacs/chownr |
| combined-stream@1.0.8 | MIT | https://github.com/felixge/node-combined-stream |
| content-disposition@0.5.4 | MIT | https://github.com/jshttp/content-disposition |
| content-type@1.0.5 | MIT | https://github.com/jshttp/content-type |
| cookie-signature@1.0.7 | MIT | https://github.com/visionmedia/node-cookie-signature |
| cookie@0.7.2 | MIT | https://github.com/jshttp/cookie |
| cors@2.8.6 | MIT | https://github.com/expressjs/cors |
| debug@2.6.9 | MIT | https://github.com/visionmedia/debug |
| debug@4.4.3 | MIT | https://github.com/debug-js/debug |
| decompress-response@6.0.0 | MIT | https://github.com/sindresorhus/decompress-response |
| deep-extend@0.6.0 | MIT | https://github.com/unclechu/node-deep-extend |
| delayed-stream@1.0.0 | MIT | https://github.com/felixge/node-delayed-stream |
| depd@2.0.0 | MIT | https://github.com/dougwilson/nodejs-depd |
| destroy@1.2.0 | MIT | https://github.com/stream-utils/destroy |
| detect-libc@2.1.2 | Apache-2.0 | https://github.com/lovell/detect-libc |
| dunder-proto@1.0.1 | MIT | https://github.com/es-shims/dunder-proto |
| ee-first@1.1.1 | MIT | https://github.com/jonathanong/ee-first |
| encodeurl@2.0.0 | MIT | https://github.com/pillarjs/encodeurl |
| end-of-stream@1.4.5 | MIT | https://github.com/mafintosh/end-of-stream |
| env-paths@2.2.1 | MIT | https://github.com/sindresorhus/env-paths |
| es-define-property@1.0.1 | MIT | https://github.com/ljharb/es-define-property |
| es-errors@1.3.0 | MIT | https://github.com/ljharb/es-errors |
| es-object-atoms@1.1.2 | MIT | https://github.com/ljharb/es-object-atoms |
| es-set-tostringtag@2.1.0 | MIT | https://github.com/es-shims/es-set-tostringtag |
| escape-html@1.0.3 | MIT | https://github.com/component/escape-html |
| etag@1.8.1 | MIT | https://github.com/jshttp/etag |
| expand-template@2.0.3 | (MIT OR WTFPL) | https://github.com/ralphtheninja/expand-template |
| exponential-backoff@3.1.3 | Apache-2.0 | https://github.com/coveooss/exponential-backoff |
| express@4.22.3 | MIT | https://github.com/expressjs/express |
| fdir@6.5.0 | MIT | https://github.com/thecodrr/fdir |
| file-uri-to-path@1.0.0 | MIT | https://github.com/TooTallNate/file-uri-to-path |
| finalhandler@1.3.2 | MIT | https://github.com/pillarjs/finalhandler |
| follow-redirects@1.16.0 | MIT | https://github.com/follow-redirects/follow-redirects |
| form-data@4.0.6 | MIT | https://github.com/form-data/form-data |
| forwarded@0.2.0 | MIT | https://github.com/jshttp/forwarded |
| fresh@0.5.2 | MIT | https://github.com/jshttp/fresh |
| fs-constants@1.0.0 | MIT | https://github.com/mafintosh/fs-constants |
| function-bind@1.1.2 | MIT | https://github.com/Raynos/function-bind |
| get-intrinsic@1.3.0 | MIT | https://github.com/ljharb/get-intrinsic |
| get-proto@1.0.1 | MIT | https://github.com/ljharb/get-proto |
| github-from-package@0.0.0 | MIT | https://github.com/substack/github-from-package |
| gopd@1.2.0 | MIT | https://github.com/ljharb/gopd |
| graceful-fs@4.2.11 | ISC | https://github.com/isaacs/node-graceful-fs |
| has-symbols@1.1.0 | MIT | https://github.com/inspect-js/has-symbols |
| has-tostringtag@1.0.2 | MIT | https://github.com/inspect-js/has-tostringtag |
| hasown@2.0.4 | MIT | https://github.com/inspect-js/hasOwn |
| http-errors@2.0.1 | MIT | https://github.com/jshttp/http-errors |
| https-proxy-agent@5.0.1 | MIT | https://github.com/TooTallNate/node-https-proxy-agent |
| https-proxy-agent@9.1.0 | MIT | https://github.com/TooTallNate/proxy-agents |
| iconv-lite@0.4.24 | MIT | https://github.com/ashtuchkin/iconv-lite |
| ieee754@1.2.1 | BSD-3-Clause | https://github.com/feross/ieee754 |
| inherits@2.0.4 | ISC | https://github.com/isaacs/inherits |
| ini@1.3.8 | ISC | https://github.com/isaacs/ini |
| ipaddr.js@1.9.1 | MIT | https://github.com/whitequark/ipaddr.js |
| isexe@4.0.0 | BlueOak-1.0.0 | https://github.com/isaacs/isexe |
| math-intrinsics@1.1.0 | MIT | https://github.com/es-shims/math-intrinsics |
| media-typer@0.3.0 | MIT | https://github.com/jshttp/media-typer |
| merge-descriptors@1.0.3 | MIT | https://github.com/sindresorhus/merge-descriptors |
| methods@1.1.2 | MIT | https://github.com/jshttp/methods |
| mime-db@1.52.0 | MIT | https://github.com/jshttp/mime-db |
| mime-types@2.1.35 | MIT | https://github.com/jshttp/mime-types |
| mime@1.6.0 | MIT | https://github.com/broofa/node-mime |
| mimic-response@3.1.0 | MIT | https://github.com/sindresorhus/mimic-response |
| minimist@1.2.8 | MIT | https://github.com/minimistjs/minimist |
| minipass@7.1.3 | BlueOak-1.0.0 | https://github.com/isaacs/minipass |
| minizlib@3.1.0 | MIT | https://github.com/isaacs/minizlib |
| mkdirp-classic@0.5.3 | MIT | https://github.com/mafintosh/mkdirp-classic |
| ms@2.0.0 | MIT | https://github.com/zeit/ms |
| ms@2.1.3 | MIT | https://github.com/vercel/ms |
| napi-build-utils@2.0.0 | MIT | https://github.com/inspiredware/napi-build-utils |
| negotiator@0.6.3 | MIT | https://github.com/jshttp/negotiator |
| node-abi@3.98.0 | MIT | https://github.com/electron/node-abi |
| node-addon-api@8.9.2 | MIT | https://github.com/nodejs/node-addon-api |
| node-gyp@12.4.0 | MIT | https://github.com/nodejs/node-gyp |
| nopt@9.0.0 | ISC | https://github.com/npm/nopt |
| object-assign@4.1.1 | MIT | https://github.com/sindresorhus/object-assign |
| object-inspect@1.13.4 | MIT | https://github.com/inspect-js/object-inspect |
| on-finished@2.4.1 | MIT | https://github.com/jshttp/on-finished |
| once@1.4.0 | ISC | https://github.com/isaacs/once |
| parseurl@1.3.3 | MIT | https://github.com/pillarjs/parseurl |
| path-to-regexp@0.1.13 | MIT | https://github.com/pillarjs/path-to-regexp |
| picomatch@4.0.7 | MIT | https://github.com/micromatch/picomatch |
| prebuild-install@7.1.3 | MIT | https://github.com/prebuild/prebuild-install |
| proc-log@6.1.0 | ISC | https://github.com/npm/proc-log |
| proxy-addr@2.0.8 | MIT | https://github.com/jshttp/proxy-addr |
| proxy-agent-negotiate@1.1.0 | MIT | https://github.com/TooTallNate/proxy-agents |
| proxy-from-env@2.1.0 | MIT | https://github.com/Rob--W/proxy-from-env |
| pump@3.0.4 | MIT | https://github.com/mafintosh/pump |
| qs@6.16.0 | BSD-3-Clause | https://github.com/ljharb/qs |
| range-parser@1.2.1 | MIT | https://github.com/jshttp/range-parser |
| raw-body@2.5.3 | MIT | https://github.com/stream-utils/raw-body |
| rc@1.2.8 | (BSD-2-Clause OR MIT OR Apache-2.0) | https://github.com/dominictarr/rc |
| readable-stream@3.6.2 | MIT | https://github.com/nodejs/readable-stream |
| safe-buffer@5.2.1 | MIT | https://github.com/feross/safe-buffer |
| safer-buffer@2.1.2 | MIT | https://github.com/ChALkeR/safer-buffer |
| semver@7.8.5 | ISC | https://github.com/npm/node-semver |
| send@0.19.2 | MIT | https://github.com/pillarjs/send |
| serve-static@1.16.3 | MIT | https://github.com/expressjs/serve-static |
| setprototypeof@1.2.0 | ISC | https://github.com/wesleytodd/setprototypeof |
| side-channel-list@1.0.1 | MIT | https://github.com/ljharb/side-channel-list |
| side-channel-map@1.0.1 | MIT | https://github.com/ljharb/side-channel-map |
| side-channel-weakmap@1.0.2 | MIT | https://github.com/ljharb/side-channel-weakmap |
| side-channel@1.1.1 | MIT | https://github.com/ljharb/side-channel |
| simple-concat@1.0.1 | MIT | https://github.com/feross/simple-concat |
| simple-get@4.0.1 | MIT | https://github.com/feross/simple-get |
| sqlite3@6.0.1 | BSD-3-Clause | https://github.com/TryGhost/node-sqlite3 |
| statuses@2.0.2 | MIT | https://github.com/jshttp/statuses |
| string_decoder@1.3.0 | MIT | https://github.com/nodejs/string_decoder |
| strip-json-comments@2.0.1 | MIT | https://github.com/sindresorhus/strip-json-comments |
| tar-fs@2.1.5 | MIT | https://github.com/mafintosh/tar-fs |
| tar-stream@2.2.0 | MIT | https://github.com/mafintosh/tar-stream |
| tar@7.5.22 | BlueOak-1.0.0 | https://github.com/isaacs/node-tar |
| tinyglobby@0.2.17 | MIT | https://github.com/SuperchupuDev/tinyglobby |
| toidentifier@1.0.1 | MIT | https://github.com/component/toidentifier |
| tunnel-agent@0.6.0 | Apache-2.0 | https://github.com/mikeal/tunnel-agent |
| type-is@1.6.18 | MIT | https://github.com/jshttp/type-is |
| undici@6.29.0 | MIT | https://github.com/nodejs/undici |
| undici@7.30.0 | MIT | https://github.com/nodejs/undici |
| unpipe@1.0.0 | MIT | https://github.com/stream-utils/unpipe |
| util-deprecate@1.0.2 | MIT | https://github.com/TooTallNate/util-deprecate |
| utils-merge@1.0.1 | MIT | https://github.com/jaredhanson/utils-merge |
| uuid@9.0.1 | MIT | https://github.com/uuidjs/uuid |
| vary@1.1.2 | MIT | https://github.com/jshttp/vary |
| which@6.0.1 | ISC | https://github.com/npm/node-which |
| wrappy@1.0.2 | ISC | https://github.com/npm/wrappy |
| ws@8.22.0 | MIT | https://github.com/websockets/ws |
| yallist@5.0.0 | BlueOak-1.0.0 | https://github.com/isaacs/yallist |

</details>

## SQLite

历史会话由 `sqlite3`（node-sqlite3）绑定的 SQLite 存储。SQLite 本体属于公共领域；node-sqlite3 的许可证见上表。安装时该库可能下载预编译二进制或在本地编译，来源以其官方说明为准。

## 第三方服务（不随仓库分发）

| 服务 | 用途 | 说明 |
| --- | --- | --- |
| 兼容 OpenAI 接口的 LLM 服务 | 对话生成 | 由使用者自行配置地址、密钥与模型，适用对应服务商条款 |
| Fish Audio | 语音合成 | 由使用者自行申请密钥，适用其使用条款及对生成内容的使用限制 |

本仓库不包含任何密钥、模型权重或服务额度。

## 未包含的内容

本仓库不包含字体、图像、音频、模型或其他美术资产，也不包含游戏客户端的任何代码或资源。

## 发布清单

- `LICENSE`、`COPYRIGHT.md` 与本文件应随仓库保留；
- 修改或新增依赖、加入任何外部资源后，应更新本文件。
