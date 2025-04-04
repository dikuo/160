// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // Draw a blue rectangle
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Set color to black
  ctx.fillRect(0, 0, canvas.width, canvas.height);    
  
  v1 = new Vector3([1, 1, 0])
  
  drawVector(v1, "red")

  document.getElementById('drawButton').addEventListener('click', handleDrawEvent)
  document.getElementById('drawOpButton').addEventListener('click', handleDrawOperationEvent)
}

function drawVector(v, color) {
  var canvas = document.getElementById('example')
  var ctx = canvas.getContext('2d')

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  
  const startX = canvas.width / 2
  const startY = canvas.height / 2

  const endX = startX + v.elements[0] * 20
  const endY = startY - v.elements[1] * 20

  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
}

function handleDrawEvent() {
  var canvas = document.getElementById('example')
  var ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  var x1 = parseFloat(document.getElementById('x1Pos').value)
  var y1 = parseFloat(document.getElementById('y1Pos').value)
  v1 = new Vector3([x1, y1, 0])

  drawVector(v1, "red")

  var x2 = parseFloat(document.getElementById('x2Pos').value)
  var y2 = parseFloat(document.getElementById('y2Pos').value)
  v2 = new Vector3([x2, y2, 0])

  drawVector(v2, "blue")
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example')
  var ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  var x1 = parseFloat(document.getElementById('x1Pos').value)
  var y1 = parseFloat(document.getElementById('y1Pos').value)
  v1 = new Vector3([x1, y1, 0])

  drawVector(v1, "red")

  var x2 = parseFloat(document.getElementById('x2Pos').value)
  var y2 = parseFloat(document.getElementById('y2Pos').value)
  v2 = new Vector3([x2, y2, 0])

  drawVector(v2, "blue")

  var operation = document.getElementById('operation').value
  var scalar = parseFloat(document.getElementById('scalar').value)

  switch(operation) {
    case 'add':
      var v3 = new Vector3()
      v3.set(v1).add(v2)
      drawVector(v3, "green")
      break
    case 'sub':
      var v3 = new Vector3()
      v3.set(v1).sub(v2)
      drawVector(v3, "green")
      break
    case 'mul':
      var v3 = new Vector3()
      v3.set(v1).mul(scalar)
      drawVector(v3, "green")
      var v4 = new Vector3()
      v4.set(v2).mul(scalar)
      drawVector(v4, "green")
      break
    case 'div':
      var v3 = new Vector3()
      v3.set(v1).div(scalar)
      drawVector(v3, "green")
      var v4 = new Vector3()
      v4.set(v2).div(scalar)
      drawVector(v4, "green")
      break
    case 'magnitude':
      console.log("Magnitude v1:", v1.magnitude())
      console.log("Magnitude v2:", v2.magnitude())
      break
    case 'normalize':
      var v3 = new Vector3()
      v3.set(v1).normalize()
      drawVector(v3, "green")
      var v4 = new Vector3()
      v4.set(v2).normalize()
      drawVector(v4, "green")
      break
    case 'angle':
      var angle = angleBetween(v1, v2)
      console.log("Angle:", angle)
      break
    case 'area':
      var area = areaTriangle(v1, v2)
      console.log("Area of the triangle:", area)
      break
  }
}

function angleBetween(v1, v2) {
  var dotProduct = Vector3.dot(v1, v2)
  var mag1 = v1.magnitude()
  var mag2 = v2.magnitude()

  if (!mag1 || !mag2) {
    return 0
  }

  var cosAlpha = dotProduct / (mag1 * mag2)

  cosAlpha = Math.min(1, Math.max(-1, cosAlpha))

  var alpha = Math.acos(cosAlpha) * 180 / Math.PI
  
  return alpha
}

function areaTriangle(v1, v2) {
  var crossProduct = Vector3.cross(v1, v2)
  var parallelogramArea = crossProduct.magnitude()
  var triangleArea = 0.5 * parallelogramArea

  return triangleArea
}