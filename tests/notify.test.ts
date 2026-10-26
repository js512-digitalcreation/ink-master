import { test } from "node:test";
import assert from "node:assert/strict";
import { type BookingInfo, emailFor, eventForStatus, messageFor, when } from "../lib/notify/messages.ts";

const b: BookingInfo = {
  status: "pending", requested_start: "2026-10-28T20:00:00Z", artistName: "Marisol Vega", clientName: "Jo Silva",
  flashTitle: "Red Rose", quoteCents: 25000, depositCents: 5000, artistNote: null, timeZone: "America/Denver",
};

test("each status maps to one event; completed sends nothing", () => {
  assert.equal(eventForStatus("pending"), "requested");
  assert.equal(eventForStatus("accepted"), "accepted");
  assert.equal(eventForStatus("declined"), "declined");
  assert.equal(eventForStatus("cancelled"), "cancelled");
  assert.equal(eventForStatus("completed"), null);
});

test("times are shown in the shop's time zone", () => {
  assert.equal(when(b.requested_start, "America/Denver"), "Wed, Oct 28, 2:00 PM");
  assert.equal(when(b.requested_start, "America/New_York"), "Wed, Oct 28, 4:00 PM");
});

test("artists hear about new and cancelled requests", () => {
  const m = messageFor("requested", b);
  assert.equal(m.to, "artist");
  assert.equal(m.body, 'Jo Silva wants the "Red Rose" flash on Wed, Oct 28, 2:00 PM.');
  assert.equal(m.path, "/dashboard#requests");
  assert.equal(messageFor("cancelled", b).to, "artist");
});

test("clients hear when accepted, with quote and deposit", () => {
  const m = messageFor("accepted", b);
  assert.equal(m.to, "client");
  assert.equal(m.title, "Marisol accepted your booking");
  assert.equal(m.body, "See you Wed, Oct 28, 2:00 PM. Quote: $250. Pay your $50 deposit to lock it in.");
  assert.equal(m.button, "Pay deposit");
  const free = messageFor("accepted", { ...b, depositCents: 0, quoteCents: null });
  assert.equal(free.body, "See you Wed, Oct 28, 2:00 PM.");
  assert.equal(free.button, "View booking");
});

test("declines pass on the artist's note", () => {
  assert.equal(messageFor("declined", { ...b, artistNote: "Fully booked this month" }).body, '"Fully booked this month"');
  assert.equal(messageFor("declined", b).body, "Try another time or another artist.");
});

test("emails escape names so nobody can inject HTML", () => {
  const e = emailFor(messageFor("requested", { ...b, clientName: '<img src=x onerror="hack()">' }), "https://inkmasters.art");
  assert.ok(!e.html.includes("<img src=x"));
  assert.ok(e.html.includes("&lt;img src=x"));
  assert.ok(e.html.includes('href="https://inkmasters.art/dashboard#requests"'));
  assert.ok(e.text.includes("https://inkmasters.art/dashboard#requests"));
});
