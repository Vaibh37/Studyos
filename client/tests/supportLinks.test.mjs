import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURE_REQUEST_URL } from "../src/services/supportLinks.js";

test("feature request opens an editable browser issue rather than a mailto link", () => {
  const url = new URL(FEATURE_REQUEST_URL);
  assert.equal(url.origin + url.pathname, "https://github.com/Vaibh37/Studyos/issues/new");
  assert.equal(url.searchParams.get("title"), "Feature request: ");
  assert.match(url.searchParams.get("body"), /What problem would it solve/);
  assert.match(url.searchParams.get("body"), /do not include private account details/i);
});
