(function() {
  class Vector {
    constructor(x, y, z) {
      this.x = x || 0
      this.y = y || 0
      this.z = z || 0
    }

    normalize() {
      const r = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
      if (r < 0.0001) {
        return new Vector(this.x, this.y, this.z)
      }

      return new Vector(this.x / r, this.y / r, this.z / r)
    }

    scale(a) {
      return new Vector(this.x * a, this.y * a, this.z * a)
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    }
  }

  class Triangle {
    constructor(a, b, c) {
      this.a = a
      this.b = b
      this.c = c

      this.normal = new Vector()
    }
  }

  class VertexBuffer {
    constructor(gl, vertices, normals, triangles) {
      this.gl = gl

      this.vbo = gl.createBuffer()
      this.nbo = gl.createBuffer()

      this.vertices = vertices
      this.normals = normals
      this.triangles = triangles

      this.update()
    }

    update() {
      const gl = this.gl

      const v = []
      const n = []

      const tris = this.triangles
      for (i = 0; i < tris.length; i++) {
        this.normals[tris[i].a] = new Vector()
        this.normals[tris[i].b] = new Vector()
        this.normals[tris[i].c] = new Vector()
      }

      for (i = 0; i < tris.length; i++) {
        const a = this.vertices[tris[i].a]
        const b = this.vertices[tris[i].b]
        const c = this.vertices[tris[i].c]

        const v0 = new Vector(b.x - a.x, b.y - a.y, b.z - a.z)
        const v1 = new Vector(c.x - a.x, c.y - a.y, c.z - a.z)

        const nx = v0.y*v1.z - v0.z*v1.y
        const ny = v0.z*v1.x - v0.x*v1.z
        const nz = v0.x*v1.y - v0.y*v1.x

        tris[i].normal = new Vector(-nx, -ny, -nz).normalize()

        const an = this.normals[tris[i].a]
        const bn = this.normals[tris[i].b]
        const cn = this.normals[tris[i].c]
        this.normals[tris[i].a] = new Vector(an.x + nx, an.y + ny, an.z + nz)
        this.normals[tris[i].b] = new Vector(bn.x + nx, bn.y + ny, bn.z + nz)
        this.normals[tris[i].c] = new Vector(cn.x + nx, cn.y + ny, cn.z + nz)
      }

      for (i = 0; i < this.normals.length; i++) {
        this.normals[i] = this.normals[i].normalize()
      }

      for (var i = 0; i < this.triangles.length; i++) {
        const a = this.vertices[this.triangles[i].a]
        const b = this.vertices[this.triangles[i].b]
        const c = this.vertices[this.triangles[i].c]

        v.push(a.x)
        v.push(a.y)
        v.push(a.z)

        v.push(b.x)
        v.push(b.y)
        v.push(b.z)

        v.push(c.x)
        v.push(c.y)
        v.push(c.z)

        const an = this.normals[this.triangles[i].a]
        const bn = this.normals[this.triangles[i].b]
        const cn = this.normals[this.triangles[i].c]

        n.push(an.x)
        n.push(an.y)
        n.push(an.z)

        n.push(bn.x)
        n.push(bn.y)
        n.push(bn.z)

        n.push(cn.x)
        n.push(cn.y)
        n.push(cn.z)
      }


      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW)

      gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(n), gl.DYNAMIC_DRAW)
    }

    static uvSphere(gl, r, nblong, nblat) {
      const verts = []
      const normals = []

      for (var i = 0; i < (nblong+1) * nblat + 2; i++) {
        verts.push(new Vector())
        normals.push(new Vector())
      }

      const pi = Math.PI
      const tau = 2*pi

      verts[0] = new Vector(0, r, 0)
      for (var lat = 0; lat < nblat; lat++) {
        var a1 = pi * (lat+1)/(nblat+1)
        var sin1 = Math.sin(a1)
        var cos1 = Math.cos(a1)

        for (var lon = 0; lon <= nblong; lon++) {
          var a2 = tau * (lon == nblong ? 0 : lon) / nblong
          var sin2 = Math.sin(a2)
          var cos2 = Math.cos(a2)

          verts[lon + lat * (nblong + 1) + 1] = new Vector(sin1 * cos2, cos1, sin1 * sin2).scale(r)
        }
      }
      verts[verts.length - 1] = new Vector(0, -r, 0)

      for (var n = 0; n < verts.length; n++) {
        normals[n] = verts[n].normalize()
      }

      var nbfaces = verts.length
      var nbtris = nbfaces * 2
      var nbindices = nbtris * 3

      var tris = []

      for (lon = 0; lon < nblong; lon++) {
        tris.push(new Triangle(lon + 2, lon + 1, 0))

      }

      for (lat = 0; lat < nblat - 1; lat++) {
        for (lon = 0; lon < nblong; lon++) {
          var current = lon + lat * (nblong + 1) + 1
          var next = current + nblong + 1

          tris.push(new Triangle(current, current + 1, next + 1))
          tris.push(new Triangle(current, next + 1, next))
        }
      }

      for (lon = 0; lon < nblong; lon++) {
        tris.push(new Triangle(verts.length - 1, verts.length - (lon+2) - 1, verts.length - (lon+1) - 1))
      }

      return new VertexBuffer(gl, verts, normals, tris)
    }

    static icoSphere(gl, r, n) {
      // http://wiki.unity3d.com/index.php/ProceduralPrimitives#C.23_-_IcoSphere

      const verts = []

      const t = (1 + Math.sqrt(5)) / 2
      verts.push(new Vector(-r,  r*t, 0).normalize())
      verts.push(new Vector( r,  r*t, 0).normalize())
      verts.push(new Vector(-r, -r*t, 0).normalize())
      verts.push(new Vector( r, -r*t, 0).normalize())

      verts.push(new Vector(0, -r,  t).normalize())
      verts.push(new Vector(0,  r,  t).normalize())
      verts.push(new Vector(0, -r, -t).normalize())
      verts.push(new Vector(0,  r, -t).normalize())

      verts.push(new Vector( t, 0, -r).normalize())
      verts.push(new Vector( t, 0,  r).normalize())
      verts.push(new Vector(-t, 0, -r).normalize())
      verts.push(new Vector(-t, 0,  r).normalize())

      var tris = []

      tris.push(new Triangle(0, 11, 5))
      tris.push(new Triangle(0, 5, 1))
      tris.push(new Triangle(0, 1, 7))
      tris.push(new Triangle(0, 7, 10))
      tris.push(new Triangle(0, 10, 11))

      tris.push(new Triangle(1, 5, 9))
      tris.push(new Triangle(5, 11, 4))
      tris.push(new Triangle(11, 10, 2))
      tris.push(new Triangle(10, 7, 6))
      tris.push(new Triangle(7, 1, 8))

      tris.push(new Triangle(3, 9, 4))
      tris.push(new Triangle(3, 4, 2))
      tris.push(new Triangle(3, 2, 6))
      tris.push(new Triangle(3, 6, 8))
      tris.push(new Triangle(3, 8, 9))

      tris.push(new Triangle(4, 9, 5))
      tris.push(new Triangle(2, 4, 11))
      tris.push(new Triangle(6, 2, 10))
      tris.push(new Triangle(8, 6, 7))
      tris.push(new Triangle(9, 8, 1))

      function getMiddlePoint(p1, p2, v, cache, r) {
        const lesserIndex  = p1 < p2 ? p1 : p2
        const greaterIndex = p1 < p2 ? p2 : p1
        const key = (lesserIndex << 16) + greaterIndex

        if (cache[key]) {
          return cache[key]
        }

        const point1 = verts[p1]
        const point2 = verts[p2]
        const mp = new Vector((point1.x+point2.x) / 2,
                              (point1.y+point2.y) / 2,
                              (point1.z+point2.z) / 2).normalize()

        const i = v.length
        v.push(new Vector(r*mp.x, r*mp.y, r*mp.z))
        cache[key] = i

        return i
      }

      var cache = {}

      for (var i = 0; i < n; i++) {
        const tris2 = tris.slice()
        for (var j = 0; j < tris.length; j++) {
          const a = getMiddlePoint(tris[j].a, tris[j].b, verts, cache, r)
          const b = getMiddlePoint(tris[j].b, tris[j].c, verts, cache, r)
          const c = getMiddlePoint(tris[j].c, tris[j].a, verts, cache, r)

          tris2.push(new Triangle(tris[j].a, a, c))
          tris2.push(new Triangle(tris[j].b, b, a))
          tris2.push(new Triangle(tris[j].c, c, b))
          tris2.push(new Triangle(a, b, c))
        }

        tris = tris2
      }

      const normals = verts
      return new VertexBuffer(gl, verts, normals, tris)
    }
  }

  class Shader {
    constructor(gl, fsSrc, vsSrc) {
      this.gl = gl

      this.fsSrc = fsSrc
      this.vsSrc = vsSrc

      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc)
      const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc)

      const prog = gl.createProgram()
      gl.attachShader(prog, fs)
      gl.attachShader(prog, vs)
      gl.linkProgram(prog)

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        alert('Could not link shader program.')
      }

      this.fs = fs
      this.vs = vs
      this.program = prog
    }

    setAttrib(name, value) {
      const loc = this.gl.getAttribLocation(this.program, name)
    }

    setUniformMat4(name, value) {
      const loc = this.gl.getUniformLocation(this.program, name)
      this.gl.uniformMatrix4fv(loc, false, value)
    }
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas
      this.gl = canvas.getContext('webgl')
      this.isRendering = false
      this.vertexBuffers = []

      this.init()

      this.rotation = 0
      this.displaceTimer = 3
      this.displacementScale = 1
      this.counter = 10000  +1

      this.cx = 0
      this.cy = 0
      this.cz = 0
    }

    init() {
      const gl = this.gl

      if (!gl) {
        alert('Could not initialize WebGL.')
      }

      gl.clearColor(1, 1, 1, 1)

      gl.enable(gl.CULL_FACE)
      gl.cullFace(gl.BACK)

      gl.enable(gl.DEPTH_TEST)
    }

    start() {
      if (this.isRendering) {
        return
      }

      this.isRendering = true
      requestAnimationFrame(() => this.drawFrame())
    }

    stop() {
      this.isRendering = false
    }

    addVertexBuffer(vb) {
      this.vertexBuffers.push(vb)
    }

    setShader(shader) {
      this.shader = shader
      this.gl.useProgram(shader.program)
    }

    setVertexBuffer(vb) {
      const gl = this.gl

      var loc = gl.getAttribLocation(this.shader.program, 'aPosition')
      gl.bindBuffer(gl.ARRAY_BUFFER, vb.vbo)
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(loc)

      loc = gl.getAttribLocation(this.shader.program, 'aNormal')
      gl.bindBuffer(gl.ARRAY_BUFFER, vb.nbo)
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(loc)
    }

    doDisplacement() {
      const vb = this.vertexBuffers[0]

      this.counter -= 1
      if (this.counter == 0) {
        for (var i = 0; i < vb.vertices.length; i++) {
          if (vb.vertices[i].length() < 0.997) {
            vb.vertices[i] = vb.vertices[i].normalize().scale(0.997 + Math.random()*0.001)
          }
        }

        vb.update()
        return
      }

      if (this.displacementScale < 0.01) {
        this.displacementScale = -1

        vb.update()
        return
      }

      var nx = Math.random() - 0.5
      var ny = Math.random() - 0.5
      var nz = Math.random() - 0.5
      var n = new Vector(nx, ny, nz).normalize()
      nx = n.x
      ny = n.y
      nz = n.z

      const q = Math.random() - 0.5
      this.cx = q*nx
      this.cy = q*ny
      this.cz = q*nz

      for (var i = 0; i < vb.vertices.length; i++) {
        const x = vb.vertices[i].x - this.cx
        const y = vb.vertices[i].y - this.cy
        const z = vb.vertices[i].z - this.cz

        const d = x*nx + y*ny + z*nz
        var f = 0
        if (d < -0.0001) {
          f = 0.0004
        } else if (d > 0.0001) {
          f = -0.0004
        }
        else {
          continue
        }

        var dir = vb.vertices[i].normalize().scale(f)

        vb.vertices[i].x += dir.x * this.displacementScale
        vb.vertices[i].y += dir.y * this.displacementScale
        vb.vertices[i].z += dir.z * this.displacementScale

        // if (vb.vertices[i].length() < 0.99) {
        //   vb.vertices[i] = vb.vertices[i].normalize().scale(0.99)
        // }

      }
    }

    drawFrame() {
      this.displaceTimer -= 1/60
      if (this.displaceTimer <= 0) {
        this.displaceTimer = 1.0

        if (this.counter > 0) {
        if (this.displacementScale > 0) {
          this.vertexBuffers[0].update()
        }
        }
      }

      if (this.counter > 0) {
        if (this.displacementScale > 0) {
          this.doDisplacement()
          this.doDisplacement()
          this.doDisplacement()
          this.doDisplacement()
          this.doDisplacement()
        }
      }

      if (this.isRendering) {
        requestAnimationFrame(() => this.drawFrame())
      }

      this.canvas.width = this.canvas.offsetWidth
      this.canvas.height = this.canvas.offsetHeight

      const gl = this.gl

      this.rotation += 0.05 * 2*Math.PI/60

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)

      const fov = 45 * Math.PI / 180
      const aspect = this.canvas.width / this.canvas.height
      const zNear = 0.1
      const zFar = 100
      const projection = mat4.create()
      const modelView = mat4.create()

      mat4.perspective(projection, fov, aspect, zNear, zFar)
      mat4.translate(modelView, modelView, vec3.fromValues(0, 0, -5))
      mat4.rotate(modelView, modelView, this.rotation, vec3.fromValues(0, 1, 0))

      const shader = this.shader
      shader.setUniformMat4('uModelView', modelView)
      shader.setUniformMat4('uProjection', projection)

      for (var i = 0; i < this.vertexBuffers.length; i++) {
        this.setVertexBuffer(this.vertexBuffers[i])
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexBuffers[i].triangles.length * 3)
      }
    }
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type)

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('Could not compile shader: \n\n' + gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return undefined
    }

    return shader
  }

  function main() {
    const canvas = document.getElementById('canvas')
    const renderer = new Renderer(canvas)

    const fsSrc = document.getElementById('fs-source').text
    const vsSrc = document.getElementById('vs-source').text

    const shader = new Shader(renderer.gl, fsSrc, vsSrc)
    renderer.setShader(shader)

    const vb = VertexBuffer.uvSphere(renderer.gl, 1, 1200, 600)//new VertexBuffer(renderer.gl, vertices, triangles)
    renderer.addVertexBuffer(vb)

    renderer.start()
  }

  main()
})()
