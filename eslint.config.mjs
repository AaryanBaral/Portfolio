import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Three.js scene code mutates scratch vectors, materials and instance buffers inside useFrame
    // (the idiomatic React Three Fiber pattern) and seeds geometry with Math.random once at setup.
    // React Compiler's purity/immutability rules don't model imperative WebGL objects, so they are
    // scoped off for this folder only.
    files: ["src/components/hero/scene/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
