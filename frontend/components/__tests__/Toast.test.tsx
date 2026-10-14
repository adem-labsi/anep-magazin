import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Toast } from "../ui/Toast";

describe("Toast", () => {
  it("applies the type variant class when shown", () => {
    const { container } = render(<Toast toast={{ message: "Article créé", type: "success" }} />);
    expect(container.querySelector(".toast")?.className).toBe("toast show success");
  });

  it("has no show or variant class when the message is empty", () => {
    const { container } = render(<Toast toast={{ message: "" }} />);
    expect(container.querySelector(".toast")?.className).toBe("toast");
  });

  it("omits the variant class when no type is provided", () => {
    const { container } = render(<Toast toast={{ message: "Simple" }} />);
    expect(container.querySelector(".toast")?.className).toBe("toast show");
  });
});
