# Changelog

## [0.9.1](https://github.com/kitn-ai/ui/compare/create-kai-v0.9.0...create-kai-v0.9.1) (2026-09-24)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.37.0

## [0.9.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.8.0...create-kai-v0.9.0) (2026-09-22)


### Features

* **scaffold:** register only the kai-* tags a scaffold or starter places ([e772101](https://github.com/kitn-ai/ui/commit/e772101f98f522a4efc258aeaf623efcc2e7b49c))
* **scaffold:** register only the kai-* tags a scaffold or starter places ([cb89e66](https://github.com/kitn-ai/ui/commit/cb89e667396ff499a45a7681bcbbe3ce3af257c4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.36.0

## [0.8.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.7.1...create-kai-v0.8.0) (2026-09-22)


### Features

* **cli:** kai init, for the project that already exists ([3f81391](https://github.com/kitn-ai/ui/commit/3f813916a7c3f13407274ff770a2d47612196dba))
* **cli:** kai init, for the project that already exists ([85392bc](https://github.com/kitn-ai/ui/commit/85392bcf1d6826a04a8cb80d3af5bdd293329454))
* **cli:** kai upgrade, and the baseline in kai.json that makes it safe ([fe32f91](https://github.com/kitn-ai/ui/commit/fe32f911cf8e09cb131da4cc62d02afe1b2071fb))
* **cli:** kai upgrade, and the baseline in kai.json that makes it safe ([059eb83](https://github.com/kitn-ai/ui/commit/059eb83171310b5dfa4c0d45dd9a633185c0d978))

## [0.7.1](https://github.com/kitn-ai/ui/compare/create-kai-v0.7.0...create-kai-v0.7.1) (2026-09-21)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.35.0

## [0.7.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.6.0...create-kai-v0.7.0) (2026-09-21)


### ⚠ BREAKING CHANGES

* **cli:** split the dev tooling into @kitn.ai/cli + @kitn.ai/mcp
* finish the rename — symbols, data keys, event types, generated names
* src/elements -> src/web-components, and `@kitn.ai/ui/elements` -> `@kitn.ai/ui/web-components`
* **create-kai:** `create-kai add <block>` writes the react form to `src/components/<id>/` instead of `src/blocks/<id>/`.
* template registry, phase-1 construct vocabulary, and the visual builder (kai dev --builder) ([#350](https://github.com/kitn-ai/ui/issues/350))
* the workspace re-cast — construction over configuration, both phases ([#302](https://github.com/kitn-ai/ui/issues/302))

### Features

* **blocks:** the authored contract, and the html / react / cdn renderers ([#374](https://github.com/kitn-ai/ui/issues/374)) ([c785d1a](https://github.com/kitn-ai/ui/commit/c785d1a389449c7582c33fd11a48d7e4cfd68ed7))
* **cli:** the follow-ups after [#382](https://github.com/kitn-ai/ui/issues/382), and the split into [@kitn](https://github.com/kitn).ai/cli + [@kitn](https://github.com/kitn).ai/mcp ([afcca63](https://github.com/kitn-ai/ui/commit/afcca633f08ca9eadf35d198b187eea9e63c5d73))
* **create-kai:** add &lt;block&gt; — registry resolution, framework detection, three forms ([8d9353d](https://github.com/kitn-ai/ui/commit/8d9353d81b4bb38cb3f0e737064d04105254a4e0))
* **create-kai:** add writes at the blocks targets table, and detects the host framework ([1528bb7](https://github.com/kitn-ai/ui/commit/1528bb71684948547a2e8490c81c750e1a807b22))
* **gallery:** the framework axis, zip download, and icon buttons (owner round 2) ([497f583](https://github.com/kitn-ai/ui/commit/497f5834cf6de511141a7927ff6cd3853b244586))
* **kai:** peel the dev tooling into [@kitn](https://github.com/kitn).ai/kai, so a browser consumer stops installing the MCP server ([0406f6c](https://github.com/kitn-ai/ui/commit/0406f6cd588e9ba5e9734f64c1a740f489faffed))
* npm create kai wizard, kai bin alias, public construct schema export ([cd37677](https://github.com/kitn-ai/ui/commit/cd376770c7b270f6282d6a270b69cdf380a8168a))
* template registry, phase-1 construct vocabulary, and the visual builder (kai dev --builder) ([#350](https://github.com/kitn-ai/ui/issues/350)) ([1b0c014](https://github.com/kitn-ai/ui/commit/1b0c01440c25c744dde7bfbedd9340ced5cbc77e))
* the workspace re-cast — construction over configuration, both phases ([#302](https://github.com/kitn-ai/ui/issues/302)) ([2d2aca0](https://github.com/kitn-ai/ui/commit/2d2aca0f166214a806b7d24a00c7951d8dd04bba))


### Bug Fixes

* **builder:** dark-by-default builder + starters (widget excepted), restore token imports in the page CSS pipeline ([#351](https://github.com/kitn-ai/ui/issues/351)) ([7a7bfbe](https://github.com/kitn-ai/ui/commit/7a7bfbe8d6cb3357958d33c8c836972bc35df232))
* **create-kai:** '.' and path positionals scaffold with a basename-derived name ([e872b33](https://github.com/kitn-ai/ui/commit/e872b331df5c7b9efe265a766c27bab37f169e3d))
* **create-kai:** build the CLI before npm packs it ([#234](https://github.com/kitn-ai/ui/issues/234)) ([0f6ab86](https://github.com/kitn-ai/ui/commit/0f6ab86a495cd4ac8e2d2d8db76720944907b4db))
* **create-kai:** npm strips .npmrc, so nextjs and tanstack-start cannot scaffold at all ([#239](https://github.com/kitn-ai/ui/issues/239)) ([7ba376d](https://github.com/kitn-ai/ui/commit/7ba376d8a7418777d04a9705aab849a7e383ec18))
* **create-kai:** offer only what scaffolds, and state what has one answer ([#275](https://github.com/kitn-ai/ui/issues/275)) ([dea2017](https://github.com/kitn-ai/ui/commit/dea2017011da80f86f3c96cea7f7e7b3c32ff431))
* **create-kai:** re-cut the kit pin, and stop it stranding on every kit minor ([#249](https://github.com/kitn-ai/ui/issues/249)) ([b892497](https://github.com/kitn-ai/ui/commit/b892497b3c9fc226f7b608ec79c0aa8fd74167b0))
* **create-kai:** read the packed listing on npm 12, which failed the release publish ([#241](https://github.com/kitn-ai/ui/issues/241)) ([df4b428](https://github.com/kitn-ai/ui/commit/df4b42851038ab09da62e9e57b6c858503e73922))
* **create-kai:** wizard registry catches up to the current construct schema ([3efeed6](https://github.com/kitn-ai/ui/commit/3efeed6f651ff94fbdbe19207ad632184411fc88))
* **docs:** stop serving CDN URLs pinned to advisory-covered versions ([#252](https://github.com/kitn-ai/ui/issues/252)) ([8baffe4](https://github.com/kitn-ai/ui/commit/8baffe4d9568344128512ef5674652b1f83cc236))
* make a release rewrite the CDN pins it invalidates ([#258](https://github.com/kitn-ai/ui/issues/258)) ([b688ae7](https://github.com/kitn-ai/ui/commit/b688ae748a2f45648e5718dc19eb4d184cd59afc))
* **scripts:** read the npm 12 pack listing in packages/ui, and guard the shape ([#271](https://github.com/kitn-ai/ui/issues/271)) ([d7a9942](https://github.com/kitn-ai/ui/commit/d7a9942a42cd35aabe61f32aeb7bc64b0758ec61))


### Code Refactoring

* **cli:** split the dev tooling into [@kitn](https://github.com/kitn).ai/cli + [@kitn](https://github.com/kitn).ai/mcp ([05df99a](https://github.com/kitn-ai/ui/commit/05df99ade57d523f0a57c6ece5e789e53b6b1997))
* finish the rename — symbols, data keys, event types, generated names ([777c4dc](https://github.com/kitn-ai/ui/commit/777c4dcc4e5e6889b24189f9b243264b8d19a2b3))
* src/elements -&gt; src/web-components, and `[@kitn](https://github.com/kitn).ai/ui/elements` -&gt; `[@kitn](https://github.com/kitn).ai/ui/web-components` ([9629f92](https://github.com/kitn-ai/ui/commit/9629f92463690166028b50eb7dd6f0828d9154c0))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.34.0

## [0.6.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.5.0...create-kai-v0.6.0) (2026-09-21)


### ⚠ BREAKING CHANGES

* finish the rename — symbols, data keys, event types, generated names
* src/elements -> src/web-components, and `@kitn.ai/ui/elements` -> `@kitn.ai/ui/web-components`
* **create-kai:** `create-kai add <block>` writes the react form to `src/components/<id>/` instead of `src/blocks/<id>/`.

### Features

* **create-kai:** add writes at the blocks targets table, and detects the host framework ([1528bb7](https://github.com/kitn-ai/ui/commit/1528bb71684948547a2e8490c81c750e1a807b22))
* **kai:** peel the dev tooling into [@kitn](https://github.com/kitn).ai/kai, so a browser consumer stops installing the MCP server ([0406f6c](https://github.com/kitn-ai/ui/commit/0406f6cd588e9ba5e9734f64c1a740f489faffed))


### Code Refactoring

* finish the rename — symbols, data keys, event types, generated names ([777c4dc](https://github.com/kitn-ai/ui/commit/777c4dcc4e5e6889b24189f9b243264b8d19a2b3))
* src/elements -&gt; src/web-components, and `[@kitn](https://github.com/kitn).ai/ui/elements` -&gt; `[@kitn](https://github.com/kitn).ai/ui/web-components` ([9629f92](https://github.com/kitn-ai/ui/commit/9629f92463690166028b50eb7dd6f0828d9154c0))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.33.0

## [0.5.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.4.0...create-kai-v0.5.0) (2026-09-03)


### Features

* **blocks:** the authored contract, and the html / react / cdn renderers ([#374](https://github.com/kitn-ai/ui/issues/374)) ([c785d1a](https://github.com/kitn-ai/ui/commit/c785d1a389449c7582c33fd11a48d7e4cfd68ed7))
* **create-kai:** add &lt;block&gt; — registry resolution, framework detection, three forms ([8d9353d](https://github.com/kitn-ai/ui/commit/8d9353d81b4bb38cb3f0e737064d04105254a4e0))
* **gallery:** the framework axis, zip download, and icon buttons (owner round 2) ([497f583](https://github.com/kitn-ai/ui/commit/497f5834cf6de511141a7927ff6cd3853b244586))


### Bug Fixes

* **create-kai:** wizard registry catches up to the current construct schema ([3efeed6](https://github.com/kitn-ai/ui/commit/3efeed6f651ff94fbdbe19207ad632184411fc88))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.32.0

## [0.4.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.3.1...create-kai-v0.4.0) (2026-08-29)


### ⚠ BREAKING CHANGES

* template registry, phase-1 construct vocabulary, and the visual builder (kai dev --builder) ([#350](https://github.com/kitn-ai/ui/issues/350))

### Features

* template registry, phase-1 construct vocabulary, and the visual builder (kai dev --builder) ([#350](https://github.com/kitn-ai/ui/issues/350)) ([1b0c014](https://github.com/kitn-ai/ui/commit/1b0c01440c25c744dde7bfbedd9340ced5cbc77e))


### Bug Fixes

* **builder:** dark-by-default builder + starters (widget excepted), restore token imports in the page CSS pipeline ([#351](https://github.com/kitn-ai/ui/issues/351)) ([7a7bfbe](https://github.com/kitn-ai/ui/commit/7a7bfbe8d6cb3357958d33c8c836972bc35df232))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.31.0

## [0.3.1](https://github.com/kitn-ai/ui/compare/create-kai-v0.3.0...create-kai-v0.3.1) (2026-08-28)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.30.0

## [0.3.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.2.2...create-kai-v0.3.0) (2026-08-28)


### Features

* npm create kai wizard, kai bin alias, public construct schema export ([cd37677](https://github.com/kitn-ai/ui/commit/cd376770c7b270f6282d6a270b69cdf380a8168a))


### Bug Fixes

* **create-kai:** '.' and path positionals scaffold with a basename-derived name ([e872b33](https://github.com/kitn-ai/ui/commit/e872b331df5c7b9efe265a766c27bab37f169e3d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.29.0

## [0.2.2](https://github.com/kitn-ai/ui/compare/create-kai-v0.2.1...create-kai-v0.2.2) (2026-08-27)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.28.0

## [0.2.1](https://github.com/kitn-ai/ui/compare/create-kai-v0.2.0...create-kai-v0.2.1) (2026-08-26)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.27.0

## [0.2.0](https://github.com/kitn-ai/ui/compare/create-kai-v0.1.4...create-kai-v0.2.0) (2026-08-24)


### ⚠ BREAKING CHANGES

* the workspace re-cast — construction over configuration, both phases ([#302](https://github.com/kitn-ai/ui/issues/302))

### Features

* the workspace re-cast — construction over configuration, both phases ([#302](https://github.com/kitn-ai/ui/issues/302)) ([2d2aca0](https://github.com/kitn-ai/ui/commit/2d2aca0f166214a806b7d24a00c7951d8dd04bba))


### Bug Fixes

* **create-kai:** offer only what scaffolds, and state what has one answer ([#275](https://github.com/kitn-ai/ui/issues/275)) ([dea2017](https://github.com/kitn-ai/ui/commit/dea2017011da80f86f3c96cea7f7e7b3c32ff431))
* **scripts:** read the npm 12 pack listing in packages/ui, and guard the shape ([#271](https://github.com/kitn-ai/ui/issues/271)) ([d7a9942](https://github.com/kitn-ai/ui/commit/d7a9942a42cd35aabe61f32aeb7bc64b0758ec61))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.26.0

## [0.1.4](https://github.com/kitn-ai/ui/compare/create-kai-v0.1.3...create-kai-v0.1.4) (2026-08-15)


### Bug Fixes

* make a release rewrite the CDN pins it invalidates ([#258](https://github.com/kitn-ai/ui/issues/258)) ([b688ae7](https://github.com/kitn-ai/ui/commit/b688ae748a2f45648e5718dc19eb4d184cd59afc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.25.2

## [0.1.3](https://github.com/kitn-ai/ui/compare/create-kai-v0.1.2...create-kai-v0.1.3) (2026-08-15)


### Bug Fixes

* **create-kai:** re-cut the kit pin, and stop it stranding on every kit minor ([#249](https://github.com/kitn-ai/ui/issues/249)) ([b892497](https://github.com/kitn-ai/ui/commit/b892497b3c9fc226f7b608ec79c0aa8fd74167b0))
* **docs:** stop serving CDN URLs pinned to advisory-covered versions ([#252](https://github.com/kitn-ai/ui/issues/252)) ([8baffe4](https://github.com/kitn-ai/ui/commit/8baffe4d9568344128512ef5674652b1f83cc236))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @kitn.ai/ui bumped to 0.25.1

## [0.1.2](https://github.com/kitn-ai/ui/compare/create-kai-v0.1.1...create-kai-v0.1.2) (2026-08-14)


### Bug Fixes

* **create-kai:** read the packed listing on npm 12, which failed the release publish ([#241](https://github.com/kitn-ai/ui/issues/241)) ([df4b428](https://github.com/kitn-ai/ui/commit/df4b42851038ab09da62e9e57b6c858503e73922))

## [0.1.1](https://github.com/kitn-ai/ui/compare/create-kai-v0.1.0...create-kai-v0.1.1) (2026-08-14)


### Bug Fixes

* **create-kai:** build the CLI before npm packs it ([#234](https://github.com/kitn-ai/ui/issues/234)) ([0f6ab86](https://github.com/kitn-ai/ui/commit/0f6ab86a495cd4ac8e2d2d8db76720944907b4db))
* **create-kai:** npm strips .npmrc, so nextjs and tanstack-start cannot scaffold at all ([#239](https://github.com/kitn-ai/ui/issues/239)) ([7ba376d](https://github.com/kitn-ai/ui/commit/7ba376d8a7418777d04a9705aab849a7e383ec18))
