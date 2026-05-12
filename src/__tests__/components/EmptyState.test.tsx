import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/EmptyState";

describe("<EmptyState>", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here yet");
  });

  it("renders a body when provided", () => {
    render(<EmptyState title="No rides" body="Try later" />);
    expect(screen.getByText("Try later")).toBeInTheDocument();
  });

  it("renders a Link action when href is set", () => {
    render(
      <EmptyState
        title="No rides"
        action={{ label: "Browse past rides", href: "/rides?status=completed" }}
      />
    );
    const link = screen.getByRole("link", { name: "Browse past rides" });
    expect(link).toHaveAttribute("href", "/rides?status=completed");
  });

  it("renders a button action when onClick is set", async () => {
    const onClick = vi.fn();
    render(<EmptyState title="No rides" action={{ label: "Refresh", onClick }} />);
    const btn = screen.getByRole("button", { name: "Refresh" });
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("has role=status for screen-reader announcement", () => {
    render(<EmptyState title="No rides" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
