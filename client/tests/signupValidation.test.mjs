import test from "node:test";
import assert from "node:assert/strict";
import { validateSignup, MAX_SIGNUP_NAME_LENGTH } from "../src/services/signupValidation.js";

test("signup rejects blank, huge or non-text names before creating an account", () => {
  for (const name of ["", "   ", null, 42, "x".repeat(50_000)]) {
    assert.throws(() => validateSignup({ name, password: "abc123" }));
  }
  assert.equal(validateSignup({ name: "x".repeat(MAX_SIGNUP_NAME_LENGTH), password: "abc123" }).length, 50);
});
test("signup accepts Unicode names and meaningful passwords containing spaces", () => {
  assert.equal(validateSignup({ name: "  طالب 🧠  ", password: " pass word " }), "طالب 🧠");
  for (const password of ["      ", "\t\t\t\t\t\t", "", "abc", null]) {
    assert.throws(() => validateSignup({ name: "Valid", password }), /password/i);
  }
});
