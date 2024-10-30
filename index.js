function error(msg) {
  const elem = document.getElementById("error");
  elem.innerText = msg;
  elem.classList.remove("hidden");
}

let device;
let shaderModule;

async function init() {
  const unsupportedBrowser = document.getElementById("unsupported-browser");
  if (navigator.gpu) {
    unsupportedBrowser.classList.add("hidden");
  } else {
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    error(
      "failed to get adapter from navigator.gpu. it looks like your environment does not have a GPU or is not supported."
    );
    unsupportedBrowser.classList.remove("hidden");
    return;
  }

  device = await adapter.requestDevice();
  if (!device) {
    error(
      "failed to get device from WebGPU adapter. it looks like your environment does not have a GPU or is not supported."
    );
    unsupportedBrowser.classList.remove("hidden");
    return;
  }

  const shaderResp = await fetch("mandelbrot.wgsl");
  if (!shaderResp.ok) {
    error("failed to load shader");
    return;
  }
  const shader = await shaderResp.text();

  shaderModule = device.createShaderModule({
    code: shader,
  });

  // document.getElementById("render-me").addEventListener("click", doStuff);

  const canvas = document.getElementById("result");
  const context = canvas.getContext("webgpu");
  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });
  const vertices = new Float32Array([
    // Triangle 1 (Blue)
    -1,
    -1,
    1,
    -1,
    1,
    1,

    -1, // Triangle 2 (Red)
    -1,
    1,
    1,
    -1,
    1,
  ]);

  const vertexBuffer = device.createBuffer({
    label: "Vertices",
    size: vertices.byteLength, // make it big enough to store vertices in
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const GRID_SIZE = 4;
  const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
  const uniformBuffer = device.createBuffer({
    label: "Grid uniforms",
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

  const vertexBuffers = [
    {
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2",
        },
      ],
      arrayStride: 8,
      stepMode: "vertex",
    },
  ];
  const pipelineDescriptor = {
    label: "Render Pipeline",
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: "auto",
  };
  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
  const commandEncoder = device.createCommandEncoder();
  const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

  const renderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(vertices.length / 2);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

init();
