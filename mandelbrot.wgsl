const CANVAS: vec2f = vec2f(1200, 800);

@vertex
fn vertex_main(@location(0) pos: vec2f) ->
  @builtin(position) vec4f {
  return vec4f(pos, 0, 1);
}

@fragment
fn fragment_main(
  @builtin(position) pos: vec4f
) -> @location(0) vec4f {
  let step_size = vec2f(3.0, 2.0) / CANVAS;
  let center = vec2f(-0.75, 0.0);
  let offset = vec2f(
    center.x - CANVAS.x / 2 * step_size.x,
    -(center.y - CANVAS.y / 2.0 * step_size.y) - 2.0,
  );
  let sample_pos = offset + (step_size * vec2f(pos.x, pos.y));

  let value = mandelbrot_pixel(sample_pos);

  let multiplier = 1.0 - (value * value) / f32(ITERATIONS);
  let i = 255.0 * multiplier;

  return vec4f(i, i, i, 1);
}

const ITERATIONS = 50000;
const THRESHOLD: f32 = 100;

fn mandelbrot_pixel(position: vec2f) -> f32 {
  var n = vec2f(0, 0);
  let c = position;
  n = n + c;

  var passed_threshold_after: i32 = ITERATIONS;

  for (var i = 0; i < ITERATIONS; i += 1) {
    n = cmul(n, n) + c;
    if n.x > THRESHOLD || n.y > THRESHOLD && passed_threshold_after == ITERATIONS {
      passed_threshold_after = i;
    }
  }

  return f32(passed_threshold_after);
}

fn cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(
    a.x * b.x - a.y * b.y,
    a.x * b.y + a.y * b.x,
  );
}