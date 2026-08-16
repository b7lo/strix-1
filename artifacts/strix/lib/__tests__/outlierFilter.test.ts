import { hampelFilterVectors } from "../signal/outlierFilter";

const vector = (x: number) => ({ x, y: 0, z: 0 });

describe("optional Hampel outlier filter", () => {
  it("removes an isolated sensor spike", () => {
    const filtered = hampelFilterVectors([0, 0, 0, 8, 0, 0, 0].map(vector));
    expect(filtered[3].x).toBe(0);
  });

  it("does not cut a multi-sample impact pulse", () => {
    const filtered = hampelFilterVectors([0, 0, 0, 4, 6, 4, 0, 0, 0].map(vector), {
      windowSize: 5,
    });

    expect(filtered.slice(3, 6).map((sample) => sample.x)).toEqual([4, 6, 4]);
    expect(Math.max(...filtered.map((sample) => sample.x))).toBe(6);
  });

  it("does not mutate the input series", () => {
    const input = [vector(0), vector(7), vector(0)];
    hampelFilterVectors(input, { windowSize: 3 });
    expect(input[1].x).toBe(7);
  });
});
