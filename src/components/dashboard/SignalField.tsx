import * as React from 'react'

const vertex = `attribute vec2 position; void main(){ gl_Position=vec4(position,0.0,1.0); }`
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
void main(){
  vec2 p=(gl_FragCoord.xy*2.0-resolution)/min(resolution.x,resolution.y);
  p.x-=0.18;
  float d=length(p)*0.085;
  float wave=sin((p.x*(1.0+d)+time)*2.15)*0.23;
  float wave2=sin((p.x*(0.58-d)-time*0.72)*3.25)*0.08;
  float line=0.009/max(0.006,abs(p.y+wave+wave2));
  float halo=0.035/max(0.025,abs(p.y+wave*0.92));
  float fade=smoothstep(1.65,0.12,length(p));
  vec3 orange=vec3(1.0,0.20,0.035);
  vec3 color=orange*(line*0.78+halo*0.14)*fade;
  color+=vec3(1.0)*pow(clamp(line,0.0,1.0),3.0)*0.42;
  gl_FragColor=vec4(color,clamp((line+halo)*fade,0.0,0.82));
}`

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const item = gl.createShader(type)
  if (!item) return null
  gl.shaderSource(item, source); gl.compileShader(item)
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) { gl.deleteShader(item); return null }
  return item
}

export function SignalField() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const canvas = canvasRef.current; const gl = canvas?.getContext('webgl', { alpha: true, antialias: false })
    if (!canvas || !gl) return
    const vs = shader(gl, gl.VERTEX_SHADER, vertex); const fs = shader(gl, gl.FRAGMENT_SHADER, fragment)
    if (!vs || !fs) return
    const program = gl.createProgram(); if (!program) return
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.useProgram(program)
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const resolution = gl.getUniformLocation(program, 'resolution'); const time = gl.getUniformLocation(program, 'time')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0; let alive = true
    const resize = () => { const dpr = Math.min(devicePixelRatio, 1.5); canvas.width = Math.floor(canvas.clientWidth*dpr); canvas.height = Math.floor(canvas.clientHeight*dpr); gl.viewport(0,0,canvas.width,canvas.height); gl.uniform2f(resolution,canvas.width,canvas.height) }
    const render = (now: number) => { if (!alive) return; gl.uniform1f(time, reduce ? 0.5 : now*0.00022); gl.drawArrays(gl.TRIANGLES,0,6); if (!reduce) raf=requestAnimationFrame(render) }
    resize(); window.addEventListener('resize',resize); raf=requestAnimationFrame(render)
    return () => { alive=false; cancelAnimationFrame(raf); window.removeEventListener('resize',resize); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buffer) }
  }, [])
  return <canvas ref={canvasRef} className="hub-signal-field" aria-hidden="true" />
}
