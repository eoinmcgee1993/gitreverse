import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/create-partner-checkout/route";

// Invalid requests must fail before looking up Stripe credentials or making network calls.
const request = (body: string) => new NextRequest("https://gitreverse.com/api/create-partner-checkout", { method: "POST", body, headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" } });

test("checkout route rejects malformed JSON and null input", async () => {
  for (const body of ["{", "null", "[]"]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).message, "string");
  }
});

test("checkout route rejects oversized requests before Stripe access", async () => {
  const response = await POST(request(JSON.stringify({ adCopy: "x".repeat(4096) })));
  assert.equal(response.status, 413);
});

test("checkout route rejects attacker-selected placement and price", async () => {
  const response = await POST(request(JSON.stringify({ placement: "__proto__", price: "price_attacker", amount: 1 })));
  assert.equal(response.status, 400);
});
