import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Register on the test runner's expect as well as the package entry point.
// Vite's dependency optimizer can otherwise load a separate expect instance.
expect.extend(matchers);
