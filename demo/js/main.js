class TriangleMesh {
  constructor(vertices, triangles) {
    console.log('vertices:', vertices.length/3, 'triangles:', triangles.length/3)

    this.vertices  = new Float32Array(vertices)
    this.normals   = new Float32Array(vertices.length)
    this.triangles = new Uint32Array(triangles)

    this.modelMatrix = mat4.create()
    mat4.identity(this.modelMatrix)

    this.requiresUpdate = true
  }

  computeNormals() {
    const vertices  = this.vertices
    const normals   = this.normals
    const triangles = this.triangles

    var i

    for (i = 0; i < normals.length; i += 3) {
      normals[i  ] = 0
      normals[i+1] = 0
      normals[i+2] = 0
    }

    for (i = 0; i < triangles.length; i += 3) {
      const a = 3*triangles[i  ]
      const b = 3*triangles[i+1]
      const c = 3*triangles[i+2]

      const ax = vertices[a  ]
      const ay = vertices[a+1]
      const az = vertices[a+2]

      const bx = vertices[b  ]
      const by = vertices[b+1]
      const bz = vertices[b+2]

      const cx = vertices[c  ]
      const cy = vertices[c+1]
      const cz = vertices[c+2]

      const px = bx - ax
      const py = by - ay
      const pz = bz - az

      const qx = cx - ax
      const qy = cy - ay
      const qz = cz - az

      const nx = py*qz - pz*qy
      const ny = pz*qx - px*qz
      const nz = px*qy - py*qx

      normals[a  ] += nx
      normals[a+1] += ny
      normals[a+2] += nz

      normals[b  ] += nx
      normals[b+1] += ny
      normals[b+2] += nz

      normals[c  ] += nx
      normals[c+1] += ny
      normals[c+2] += nz
    }
  }

  updateBuffers(gl) {
    if (!this.requiresUpdate) {
      return
    }

    this.requiresUpdate = false

    this.computeNormals()

    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW)
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices, 0, this.vertices.length)
    }

    if (!this.normalBuffer) {
      this.normalBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW)
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.normals, 0, this.normals.length)
    }

    if (!this.indexBuffer) {
      this.indexBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.triangles, gl.DYNAMIC_DRAW)
    }
  }

  static quad(width, height) {
    const vertices = [ -width/2, -height/2, 0
                     , -width/2,  height/2, 0
                     ,  width/2,  height/2, 0
                     ,  width/2, -height/2, 0
                     ]

    const triangles = [ 0, 1, 2
                      , 2, 3, 0
                      ]

    return new TriangleMesh(vertices, triangles)
  }

  static sphere(radius, m, n) {
    const vertices = new Array(3 * (m * n + 2))

    const vertex = (i, x, y, z) => { vertices[3*i] = x; vertices[3*i+1] = y; vertices[3*i+2] = z }

    vertex(0, 0, radius, 0)

    for (var i = 0; i < m; i++) {
      const theta1 = Math.PI * (i+1)/(m+1)
      const sin1 = Math.sin(theta1)
      const cos1 = Math.cos(theta1)

      for (var j = 0; j < n; j++) {
        const theta2 = 2*Math.PI * (j % n) / n
        const sin2 = Math.sin(theta2)
        const cos2 = Math.cos(theta2)

        vertex(i*n + j+1, radius*sin1*cos2, radius*cos1, radius*sin1*sin2)
      }
    }

    vertex(vertices.length/3-1, 0, -radius, 0)

    const triangles = []

    for (i = 0; i < n; i++) {
      triangles.push((i+1) % n + 1)
      triangles.push(i+1)
      triangles.push(0)
    }

    for (i = 0; i < m - 1; i++) {
      for (j = 0; j < n; j++) {
        const a = i*n + j+1
        const b = a + n

        triangles.push(a)
        triangles.push(j == (n-1) ? (a+1-n) : a+1)
        triangles.push(b)

        triangles.push(j == (n-1) ? (a+1-n) : a+1)
        triangles.push(j == (n-1) ? (b+1-n) : b+1)
        triangles.push(b)
      }
    }

    const k = vertices.length/3
    for (i = 0; i < n; i++) {
      triangles.push(k - 1)
      triangles.push(i == (n-1) ? k - 3 - i + n : k - 3 - i)
      triangles.push(k - 2 - i)
    }

    return new TriangleMesh(vertices, triangles)
  }
}

class Camera {
  constructor() {
    this.up = vec3.fromValues(0, 1, 0)

    this.fovDeg = 60
    this.pos = vec3.create()
    this.target = vec3.fromValues(0, 0, 1)
    this.aspect = 1
    this.zNear = 0.1
    this.zFar = 100

    this.projectionMatrix = mat4.create()
    this.viewMatrix = mat4.create()
  }

  fieldOfView(fovDeg) {
    this.fovDeg = fovDeg
    return this
  }

  position(x, y, z) {
    this.pos = vec3.fromValues(x, y, z)
    return this
  }

  lookAt(x, y, z) {
    this.target = vec3.fromValues(x, y, z)
    return this
  }

  update(gl) {
    const fov = this.fovDeg * Math.PI/180

    mat4.perspective(this.projectionMatrix, fov, this.aspect, this.zNear, this.zFar)
    mat4.lookAt(this.viewMatrix, this.pos, this.target, this.up)
  }
}

class Shader {
  constructor(gl, program) {
    this.gl = gl
    this.program = program

    this.positionAttrib = gl.getAttribLocation(program, 'position')
    this.normalAttrib = gl.getAttribLocation(program, 'normal')
  }

  uniformMat4(name, value) {
    const gl = this.gl

    const l = gl.getUniformLocation(this.program, name)
    if (l) {
      gl.uniformMatrix4fv(l, false, value)
    }
  }

  static fromSources(gl, fsSrc, vsSrc) {
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    const vs = gl.createShader(gl.VERTEX_SHADER)

    gl.shaderSource(fs, fsSrc)
    gl.compileShader(fs)

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      alert('Could not compile shader: \n\n' + gl.getShaderInfoLog(fs))
      gl.deleteShader(fs)
      return undefined
    }

    gl.shaderSource(vs, vsSrc)
    gl.compileShader(vs)

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      alert('Could not compile shader: \n\n' + gl.getShaderInfoLog(vs))
      gl.deleteShader(fs)
      gl.deleteShader(vs)
      return undefined
    }

    const program = gl.createProgram()

    gl.attachShader(program, fs)
    gl.attachShader(program, vs)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert('Could not link shader program.')
      gl.deleteProgram(program)
      gl.deleteShader(fs)
      gl.deleteShader(vs)
      return undefined
    }

    return new Shader(gl, program)
  }
}

class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl')

    this.canvas = canvas
    this.gl = gl

    this.camera = null
    this.meshes = []
    this.shader = null

    gl.clearColor(1, 1, 1, 1)

    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)

    gl.enable(gl.DEPTH_TEST)

    if (!gl.getExtension('OES_element_index_uint')) {
      console.error('OES_element_index_uint extension not available')
    }
  }

  start() {
    if (this.isRendering) {
      return
    }

    this.isRendering = true
    requestAnimationFrame(() => this.render())
  }

  stop() {
    if (!this.isRendering) {
      return
    }

    this.isRendering = false
  }

  render() {
    if (!this.camera) {
      console.error('no camera set')
      this.stop()
    }

    if (!this.shader) {
      console.error('no shader set')
      this.stop()
    }

    if (!this.isRendering) {
      return
    }

    requestAnimationFrame(() => this.render())

    const canvas = this.canvas
    const gl = this.gl
    const camera = this.camera
    const meshes = this.meshes
    const shader = this.shader

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    gl.viewport(0, 0, canvas.width, canvas.height)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    camera.aspect = canvas.width / canvas.height
    camera.update(gl)

    gl.useProgram(shader.program)

    shader.uniformMat4('projection', camera.projectionMatrix)
    shader.uniformMat4('view', camera.viewMatrix)

    for (var i = 0; i < meshes.length; i++) {
      const mesh = meshes[i]

      if (mesh.requiresUpdate) {
        mesh.updateBuffers(gl)
      }

      shader.uniformMat4('model', mesh.modelMatrix)

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer)
      gl.vertexAttribPointer(shader.positionAttrib, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(shader.positionAttrib)

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer)
      gl.vertexAttribPointer(shader.normalAttrib, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(shader.normalAttrib)

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)

      gl.drawElements(gl.TRIANGLES, mesh.triangles.length, gl.UNSIGNED_INT, 0)
    }
  }
}

function applyIteration(trimesh) {
  const k = 0.0002

  const nx = Math.random() - 0.5
  const ny = Math.random() - 0.5
  const nz = Math.random() - 0.5

  const a = Math.random() > 0.5 ? 1 : -1
  const cx = a*nx
  const cy = a*ny
  const cz = a*nz

  const vertices = trimesh.vertices

  for (var i = 0; i < vertices.length; i += 3) {
    var x = vertices[i]
    var y = vertices[i+1]
    var z = vertices[i+2]

    const d = (x-cx)*nx + (y-cy)*ny + (z-cz)*nz

    const r = Math.sqrt(x*x + y*y + z*z)
    const rx = x/r
    const ry = y/r
    const rz = z/r

    if (d < 0) {
      x += k*rx
      y += k*ry
      z += k*rz
    } else if (d > 0) {
      x -= k*rx
      y -= k*ry
      z -= k*rz
    }

    vertices[i  ] = x
    vertices[i+1] = y
    vertices[i+2] = z
  }

  trimesh.requiresUpdate = true
}

function main() {
  const canvas = document.getElementById('canvas')
  const renderer = new Renderer(canvas)

  renderer.camera = new Camera().fieldOfView(60).position(0, 1, 3).lookAt(0, 0, 0)

  const fsSrc = document.getElementById('fs-source').text
  const vsSrc = document.getElementById('vs-source').text
  renderer.shader = Shader.fromSources(renderer.gl, fsSrc, vsSrc)

  const sphere = TriangleMesh.sphere(1, 640, 1280)
  renderer.meshes = [ sphere ]

  renderer.start()

  var rotation = 0
  var anim = () => {
    mat4.fromRotation(sphere.modelMatrix, rotation, vec3.fromValues(0, 1, 0))

    rotation += 1/40 * 2*Math.PI/60

    if (rotation >= 2*Math.PI) {
      rotation -= 2*Math.PI
    }

    requestAnimationFrame(() => anim())
  }

  requestAnimationFrame(() => anim())

  var generateLandscapes = () => {
    applyIteration(sphere)
    requestAnimationFrame(() => generateLandscapes())
  }

  setTimeout(() => generateLandscapes(), 1000)
}

main()
