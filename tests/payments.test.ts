import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHandle, describeMethods, payLink } from "../lib/payments.ts";

test("cash alone reads as 'Cash only'; several read as a list in a fixed order", () => {
  assert.equal(describeMethods(["cash"]), "Cash only");
  assert.equal(describeMethods(["cash", "venmo", "paypal"]), "Venmo · PayPal · Cash");
  assert.equal(describeMethods(["card", "bitcoin"]), "Card in shop");
});

test("handles are cleaned from links, @names and $tags", () => {
  assert.equal(cleanHandle("venmo", " @Ink-Jo "), "Ink-Jo");
  assert.equal(cleanHandle("venmo", "https://venmo.com/u/ink_jo"), "ink_jo");
  assert.equal(cleanHandle("paypal", "https://www.paypal.me/InkJo/25"), "InkJo");
  assert.equal(cleanHandle("paypal", "paypal.me/inkjo"), "inkjo");
  assert.equal(cleanHandle("cashapp", "$inkjo"), "inkjo");
  assert.equal(cleanHandle("cashapp", "https://cash.app/$inkjo"), "inkjo");
  assert.equal(cleanHandle("zelle", "  jo@example.com "), "jo@example.com");
  // the links the apps share today
  assert.equal(cleanHandle("venmo", "https://account.venmo.com/u/ink_jo"), "ink_jo");
  assert.equal(cleanHandle("paypal", "https://www.paypal.com/paypalme/InkJo"), "InkJo");
  // an unrecognised link is rejected rather than saved as the username
  assert.equal(cleanHandle("venmo", "https://venmo.example.com/whatever"), "");
  assert.equal(cleanHandle("paypal", "https://www.paypal.com/myaccount"), "");
});

test("junk handles are rejected", () => {
  assert.equal(cleanHandle("venmo", ""), "");
  assert.equal(cleanHandle("venmo", "@"), "");
  assert.equal(cleanHandle("cashapp", "$ink<script>"), "");
});

test("pay links fill in the deposit", () => {
  assert.equal(payLink("paypal", "InkJo", 5000, "x"), "https://paypal.me/InkJo/50.00USD");
  assert.equal(payLink("cashapp", "inkjo", 2550, "x"), "https://cash.app/$inkjo/25.50");
  assert.equal(
    payLink("venmo", "ink-jo", 5000, "Deposit · Ink Masters"),
    "https://venmo.com/?txn=pay&recipients=ink-jo&amount=50.00&note=Deposit%20%C2%B7%20Ink%20Masters"
  );
});

test("Zelle, cash, card and missing handles have no link", () => {
  assert.equal(payLink("zelle", "jo@example.com", 5000, "x"), null);
  assert.equal(payLink("cash", null, 5000, "x"), null);
  assert.equal(payLink("card", null, 5000, "x"), null);
  assert.equal(payLink("venmo", "", 5000, "x"), null);
});
