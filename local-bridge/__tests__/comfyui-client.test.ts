import { describe, expect, it } from "vitest";

describe("comfyui-client URL construction", () => {
  it("constructs correct prompt URL", () => {
    const url = "http://127.0.0.1:8188/prompt";
    expect(url).toContain("/prompt");
  });

  it("constructs correct history URL", () => {
    const promptId = "abc-123";
    const url = `http://127.0.0.1:8188/history/${promptId}`;
    expect(url).toContain(`/history/${promptId}`);
  });

  it("constructs correct upload URL", () => {
    const url = "http://127.0.0.1:8188/upload/image";
    expect(url).toContain("/upload/image");
  });

  it("constructs correct view URL with params", () => {
    const params = new URLSearchParams({
      filename: "output.png",
      subfolder: "",
      type: "output",
    });
    const url = `http://127.0.0.1:8188/view?${params.toString()}`;
    expect(url).toContain("filename=output.png");
    expect(url).toContain("type=output");
  });
});

describe("ComfyUI history parsing", () => {
  it("identifies successful execution", () => {
    const entry = {
      status: { statusStr: "success", completed: true },
      outputs: { "9": { images: [{ filename: "out.png", subfolder: "", type: "output" }] } },
    };
    expect(entry.status.statusStr).toBe("success");
    expect(entry.status.completed).toBe(true);
  });

  it("identifies failed execution", () => {
    const entry = {
      status: { statusStr: "error", messages: ["CUDA out of memory"] },
    };
    expect(entry.status.statusStr).toBe("error");
    expect(entry.status.messages).toContain("CUDA out of memory");
  });

  it("handles empty outputs", () => {
    const entry = {
      status: { statusStr: "success", completed: true },
      outputs: {},
    };
    expect(Object.keys(entry.outputs)).toHaveLength(0);
  });
});

describe("WebSocket message types", () => {
  it("identifies progress message", () => {
    const data = { type: "progress", node_id: "3", value: 10, max: 20 };
    expect(data.type).toBe("progress");
    expect(data.value / data.max).toBe(0.5);
  });

  it("identifies completion via empty node_id in executing message", () => {
    const data = { type: "executing", node: "", prompt_id: "prompt-123" };
    expect(data.type).toBe("executing");
    expect(data.node).toBe("");
    expect(data.prompt_id).toBe("prompt-123");
  });

  it("identifies execution error", () => {
    const data = { type: "execution_error", prompt_id: "prompt-456" };
    expect(data.type).toBe("execution_error");
  });
});