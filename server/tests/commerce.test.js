import { describe, test, expect } from "@jest/globals";
import { calculateTotals } from "../src/commerce.js";
describe("Server totals", () => {
  test("applies discount cap, free shipping and tax using minor units", () => {
    expect(
      calculateTotals(
        300000,
        { type: "percent", value: 20, maxDiscount: 30000 },
        { shippingThreshold: 199900, shippingFee: 15000, taxPercent: 5 },
      ),
    ).toEqual({
      subtotal: 300000,
      discount: 30000,
      shipping: 0,
      tax: 13500,
      total: 283500,
    });
  });
  test("discount cannot make total negative", () => {
    expect(
      calculateTotals(
        1000,
        { type: "flat", value: 2000 },
        { shippingThreshold: 10000, shippingFee: 0, taxPercent: 0 },
      ).total,
    ).toBe(0);
  });
  test("shipping uses discounted subtotal", () => {
    expect(
      calculateTotals(
        200000,
        { type: "percent", value: 10 },
        { shippingThreshold: 199900, shippingFee: 15000, taxPercent: 0 },
      ).total,
    ).toBe(195000);
  });
});
