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

  document.getElementById("render-me").addEventListener("click", doStuff);
}

async function doStuff() {
  const output = device.createBuffer({
    size: 1000,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const stagingBuffer = device.createBuffer({
    size: 1000,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: output,
        },
      },
    ],
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(Math.ceil(1000 / 64));
  passEncoder.end();
  commandEncoder.copyBufferToBuffer(
    output,
    0, // source offset
    stagingBuffer,
    0, // destination offest
    1000
  );

  device.queue.submit([commandEncoder.finish()]);

  await stagingBuffer.mapAsync(
    GPUMapMode.READ,
    0, // offset
    1000 // length
  );
  const copyArrayBuffer = stagingBuffer.getMappedRange(0, 1000);
  const data = copyArrayBuffer.slice();
  stagingBuffer.unmap();
  console.log(new Float32Array(data));
}

init();
