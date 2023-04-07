import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // We have to set interopDefault to true in order to import lodash into our
    // tests. Vitest requires libraries to export ES modules, which lodash
    // does not. For more, see:
    // https://github.com/vitest-dev/vitest/issues/2544#issuecomment-1361055399
    deps: { interopDefault: true },
    silent: false,
  },
});
