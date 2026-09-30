import { NotExported } from '../../../../src/components/button/button-internals'; // lint:dangling-imports: allowed -- the fixture names a private module that must not resolve
export const x = NotExported;
