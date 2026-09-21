# Changelog

## [0.2.0](https://github.com/kitn-ai/ui/compare/@kitn.ai/cli-v0.1.0...@kitn.ai/cli-v0.2.0) (2026-09-21)


### ⚠ BREAKING CHANGES

* **cli:** split the dev tooling into @kitn.ai/cli + @kitn.ai/mcp

### Features

* **cli:** the follow-ups after [#382](https://github.com/kitn-ai/ui/issues/382), and the split into [@kitn](https://github.com/kitn).ai/cli + [@kitn](https://github.com/kitn).ai/mcp ([afcca63](https://github.com/kitn-ai/ui/commit/afcca633f08ca9eadf35d198b187eea9e63c5d73))


### Code Refactoring

* **cli:** split the dev tooling into [@kitn](https://github.com/kitn).ai/cli + [@kitn](https://github.com/kitn).ai/mcp ([05df99a](https://github.com/kitn-ai/ui/commit/05df99ade57d523f0a57c6ece5e789e53b6b1997))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * create-kai bumped from ^0.6.0 to ^0.7.0
  * devDependencies
    * @kitn.ai/ui bumped to 0.34.0

## [0.2.0](https://github.com/kitn-ai/ui/compare/@kitn.ai/kai-v0.1.0...@kitn.ai/kai-v0.2.0) (2026-09-21)


### Features

* **kai:** a guard for the class nothing caught -- a stale CLI invocation in prose ([c1d48ce](https://github.com/kitn-ai/ui/commit/c1d48ce9b5ad6c0b4b7db2798db08d9459cdef48))
* **kai:** peel the dev tooling into [@kitn](https://github.com/kitn).ai/kai, so a browser consumer stops installing the MCP server ([0406f6c](https://github.com/kitn-ai/ui/commit/0406f6cd588e9ba5e9734f64c1a740f489faffed))
* **kai:** pin the CLI's bundle shape, and fix the CI gap the local ladder could not see ([ac3dab1](https://github.com/kitn-ai/ui/commit/ac3dab1d15c308b613e522f4046ccf043220c775))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @kitn.ai/ui bumped from ^0.32.0 to ^0.33.0
